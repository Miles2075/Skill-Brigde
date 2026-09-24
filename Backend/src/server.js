import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { v4 as uuid } from 'uuid'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, 'data.json')
const UPLOADS = path.join(__dirname, '..', 'uploads')
const PORT = Number(process.env.PORT || 5000)
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))
await fs.mkdir(UPLOADS, { recursive: true })
app.use('/uploads', express.static(UPLOADS))

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
})
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Only video files are allowed'))
    cb(null, true)
  },
})

const read = async () => JSON.parse(await fs.readFile(FILE, 'utf8'))
const save = d => fs.writeFile(FILE, JSON.stringify(d, null, 2))
const randomQuestions = (questions, previousIds = []) => {
  const pool = [...questions]
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  const count = Math.min(5, pool.length)
  let selected = pool.slice(0, count)
  if (pool.length > count && previousIds.length === count && selected.every(x => previousIds.includes(x.id))) {
    const replacement = pool.find(x => !previousIds.includes(x.id))
    if (replacement) selected[count - 1] = replacement
  }
  return selected
}
const sign = u => jwt.sign({ sub: u.id, role: u.role }, SECRET, { expiresIn: '7d' })
const safeUser = u => { const { passwordHash, ...x } = u; return x }

async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    if (!h.startsWith('Bearer ')) throw new Error()
    const p = jwt.verify(h.slice(7), SECRET), d = await read(), u = d.users.find(x => x.id === p.sub)
    if (!u) throw new Error()
    req.user = u; next()
  } catch { res.status(401).json({ message: 'Authentication required' }) }
}
const role = wanted => (req, res, next) => req.user.role === wanted ? next() : res.status(403).json({ message: 'Insufficient permissions' })
const ownerCourse = (d, id, userId) => d.courses.find(c => c.id === id && c.instructorId === userId)
const enrollmentFor = (d, courseId, userId) => d.enrollments.find(e => e.courseId === courseId && e.userId === userId)
const canAccessCourse = (d, courseId, user) => {
  const course = d.courses.find(c => c.id === courseId)
  if (!course) return { course: null, enrollment: null, allowed: false }
  if (user.role === 'instructor') return { course, enrollment: null, allowed: course.instructorId === user.id }
  const enrollment = enrollmentFor(d, courseId, user.id)
  return { course, enrollment, allowed: Boolean(enrollment) }
}

app.get('/api/health', (_, r) => r.json({ ok: true, service: 'Skillbridge API' }))

// ---------- Auth ----------
app.post('/api/auth/login', async (req, res) => {
  const d = await read(), email = String(req.body.email || '').toLowerCase().trim(), u = d.users.find(x => x.email === email)
  if (!u || !(await bcrypt.compare(req.body.password || '', u.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' })
  res.json({ user: safeUser(u), token: sign(u) })
})
app.post('/api/auth/register', async (req, res) => {
  const d = await read(), email = String(req.body.email || '').toLowerCase().trim(), password = String(req.body.password || '')
  const requestedRole = String(req.body.role || 'student').toLowerCase()
  if (!req.body.name || !email || password.length < 6) return res.status(400).json({ message: 'Name, email and password (6+ characters) are required' })
  if (!['student','instructor'].includes(requestedRole)) return res.status(400).json({ message: 'Role must be student or instructor' })
  if (d.users.some(x => x.email === email)) return res.status(409).json({ message: 'Email already registered' })
  const u = { id: uuid(), name: String(req.body.name).trim(), email, passwordHash: await bcrypt.hash(password, 10), role: requestedRole }
  d.users.push(u); await save(d); res.status(201).json({ user: safeUser(u), token: sign(u) })
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }))

// ---------- Student ----------
app.get('/api/dashboard', auth, async (req, res) => {
  const d = await read(), es = d.enrollments.filter(e => e.userId === req.user.id)
  const courses = es.map(e => {
    const course = d.courses.find(c => c.id === e.courseId)
    const lessons = d.lessons.filter(l => l.courseId === e.courseId)
    const validIds = new Set(lessons.map(l => l.id))
    const completedIds = Array.isArray(e.completedLessonIds) ? e.completedLessonIds.filter(id => validIds.has(id)) : []
    const completedLessons = Math.min(lessons.length, Math.max(0, completedIds.length || Number(e.completedLessons) || 0))
    const progress = lessons.length ? Math.min(100, Math.max(0, Math.round(completedLessons / lessons.length * 100))) : 0
    return { ...course, progress, completedLessons, lastLessonId: e.lastLessonId, completed: progress >= 100 || e.status === 'completed', completedAt: e.completedAt || null }
  }).filter(Boolean)
  const attempts = d.quizAttempts.filter(a => a.userId === req.user.id)
  const assignments = d.assignments.filter(a => es.some(e => e.courseId === a.courseId)).map(a => { const submission=d.submissions.find(s=>s.assignmentId===a.id&&s.userId===req.user.id); return {...a, submissionStatus:submission?.status||'not_submitted', submittedAt:submission?.submittedAt||null, score:submission?.score??null, feedback:submission?.feedback||'', gradedAt:submission?.gradedAt||null, remarksProvided:Boolean(submission?.feedback)} })
  res.json({ user: safeUser(req.user), stats: { coursesEnrolled: es.length, hoursThisWeek: 12.5, avgQuizScore: attempts.length ? Math.round(attempts.reduce((s,a)=>s+a.score,0)/attempts.length) : 0, certificates: d.certificates.filter(c=>c.userId===req.user.id).length }, courses, assignments, notifications: d.notifications.filter(n=>n.userId===req.user.id), recentQuizzes: attempts.slice(-5).reverse() })
})
app.get('/api/courses', async (req, res) => {
  const d = await read(); let courses = d.courses.filter(c => c.published)
  const q = String(req.query.search || '').toLowerCase().trim(); if (q) courses = courses.filter(c => `${c.title} ${c.description} ${c.category} ${c.level}`.toLowerCase().includes(q))
  res.json({ courses })
})
app.get('/api/courses/:id', async (req, res) => {
  const d = await read(), c = d.courses.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ message: 'Course not found' })
  res.json({ course: c, lessons: d.lessons.filter(x => x.courseId === c.id).sort((a,b)=>a.order-b.order), quizzes: d.quizzes.filter(x=>x.courseId===c.id).map(q=>({...q,questions:q.questions.map(({answer,...x})=>x)})) })
})
app.get('/api/courses/:id/player',auth,async(req,res)=>{
  const d=await read(), access=canAccessCourse(d,req.params.id,req.user)
  if(!access.allowed)return res.status(403).json({message:req.user.role==='student'?'Enroll in this course to access the course player':'You can only preview your own courses'})
  res.json({course:access.course,lessons:d.lessons.filter(x=>x.courseId===access.course.id).sort((a,b)=>a.order-b.order)})
})
app.post('/api/courses/:id/enroll', auth, role('student'), async (req, res) => {
  const d=await read(); const course=d.courses.find(c=>c.id===req.params.id); if(!course)return res.status(404).json({message:'Course not found'}); if(!course.published)return res.status(400).json({message:'This course is not published yet'})
  if(d.enrollments.some(e=>e.userId===req.user.id&&e.courseId===req.params.id))return res.status(409).json({message:'Already enrolled'})
  const e={id:uuid(),userId:req.user.id,courseId:req.params.id,progress:0,completedLessons:0,completedLessonIds:[],lastLessonId:null}; d.enrollments.push(e); await save(d); res.status(201).json({enrollment:e})
})
app.get('/api/courses/:courseId/progress', auth, async (req,res)=>{
  const d=await read(), e=enrollmentFor(d,req.params.courseId,req.user.id)
  if(!e)return res.status(404).json({message:'Not enrolled'})
  const lessons=d.lessons.filter(l=>l.courseId===e.courseId), valid=new Set(lessons.map(l=>l.id))
  e.completedLessonIds=[...new Set((Array.isArray(e.completedLessonIds)?e.completedLessonIds:[]).filter(id=>valid.has(id)))]
  e.completedLessons=e.completedLessonIds.length
  e.progress=lessons.length?Math.min(100,Math.max(0,Math.round(e.completedLessons/lessons.length*100))):0
  e.status=e.progress>=100?'completed':e.progress>0?'in_progress':'not_started'
  await save(d)
  res.json({progress:e})
})
app.post('/api/courses/:courseId/lessons/:lessonId/complete', auth, role('student'), async (req,res)=>{
  const d=await read(), e=enrollmentFor(d,req.params.courseId,req.user.id), l=d.lessons.find(x=>x.id===req.params.lessonId&&x.courseId===req.params.courseId), course=d.courses.find(x=>x.id===req.params.courseId)
  if(!e)return res.status(404).json({message:'Not enrolled'})
  if(!l||!course)return res.status(404).json({message:'Lesson not found'})
  const lessons=d.lessons.filter(x=>x.courseId===e.courseId), valid=new Set(lessons.map(x=>x.id))
  const completedIds=new Set((Array.isArray(e.completedLessonIds)?e.completedLessonIds:[]).filter(id=>valid.has(id)))
  completedIds.add(l.id)
  e.completedLessonIds=[...completedIds]
  e.completedLessons=e.completedLessonIds.length
  e.progress=lessons.length?Math.min(100,Math.max(0,Math.round(e.completedLessons/lessons.length*100))):0
  e.lastLessonId=l.id
  const newlyCompleted=e.progress>=100 && e.status!=='completed'
  if(e.progress>=100){
    e.progress=100; e.status='completed';
    if(!e.completedAt)e.completedAt=new Date().toISOString()
    if(!d.certificates.some(c=>c.userId===req.user.id&&c.courseId===course.id)){d.certificates.push({id:uuid(),userId:req.user.id,courseId:course.id,courseTitle:course.title,studentName:req.user.name,issuedAt:e.completedAt})}
    if(newlyCompleted)d.notifications.unshift({id:uuid(),userId:req.user.id,title:'Course completed 🎉',description:`You completed ${course.title}. You can rewatch the course anytime.`,read:false,createdAt:e.completedAt})
  }else e.status='in_progress'
  await save(d); res.json({progress:e,completed:e.progress>=100})
})

// ---------- Notes / comments ----------
app.get('/api/courses/:courseId/lessons/:lessonId/notes', auth, async (req,res)=>{
  const d=await read(), access=canAccessCourse(d,req.params.courseId,req.user)
  if(!access.allowed)return res.status(403).json({message:'Course access required'})
  const n=d.notes.find(x=>x.userId===req.user.id&&x.courseId===req.params.courseId&&x.lessonId===req.params.lessonId);res.json({note:n||{body:''}})
})
app.put('/api/courses/:courseId/lessons/:lessonId/notes',auth,async(req,res)=>{
  const d=await read(), access=canAccessCourse(d,req.params.courseId,req.user)
  if(!access.allowed)return res.status(403).json({message:'Course access required'})
  if(!d.lessons.some(l=>l.id===req.params.lessonId&&l.courseId===req.params.courseId))return res.status(400).json({message:'Lesson not found'})
  let n=d.notes.find(x=>x.userId===req.user.id&&x.courseId===req.params.courseId&&x.lessonId===req.params.lessonId);if(!n){n={id:uuid(),userId:req.user.id,courseId:req.params.courseId,lessonId:req.params.lessonId,body:''};d.notes.push(n)}n.body=String(req.body.body||'');n.updatedAt=new Date().toISOString();await save(d);res.json({note:n})
})
app.get('/api/courses/:id/comments',auth,async(req,res)=>{
  const d=await read(), access=canAccessCourse(d,req.params.id,req.user)
  if(!access.allowed)return res.status(403).json({message:req.user.role==='student'?'Enroll in this course to view its discussions':'You can only view discussions for your own courses'})
  const lessonId=String(req.query.lessonId||''); const comments=d.comments.filter(x=>x.courseId===access.course.id&&(!lessonId||x.lessonId===lessonId||!x.lessonId)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)); res.json({comments})
})
app.post('/api/courses/:id/comments',auth,role('student'),async(req,res)=>{
  const body=String(req.body.body||'').trim();if(!body)return res.status(400).json({message:'Comment cannot be empty'});const d=await read(), access=canAccessCourse(d,req.params.id,req.user),lessonId=String(req.body.lessonId||'');if(!access.allowed)return res.status(403).json({message:'Enroll in this course before commenting'});if(!lessonId||!d.lessons.some(l=>l.id===lessonId&&l.courseId===access.course.id))return res.status(400).json({message:'A valid lesson is required'});const c={id:uuid(),courseId:access.course.id,lessonId,userId:req.user.id,userName:req.user.name,body,createdAt:new Date().toISOString()};d.comments.push(c);await save(d);res.status(201).json({comment:c})
})
app.delete('/api/comments/:id',auth,async(req,res)=>{const d=await read(),i=d.comments.findIndex(c=>c.id===req.params.id);if(i<0)return res.status(404).json({message:'Comment not found'});const comment=d.comments[i];const allowed=comment.userId===req.user.id||(req.user.role==='instructor'&&Boolean(ownerCourse(d,comment.courseId,req.user.id)));if(!allowed)return res.status(403).json({message:'Not allowed'});d.comments.splice(i,1);await save(d);res.json({ok:true})})

// ---------- Quizzes ----------
app.get('/api/quizzes/course/:courseId',auth,role('student'),async(req,res)=>{
  const d=await read(),enrolled=enrollmentFor(d,req.params.courseId,req.user.id); if(!enrolled)return res.status(403).json({message:'Enroll in this course to take its assessment'})
  const c=d.courses.find(x=>x.id===req.params.courseId); if(!c)return res.status(404).json({message:'Course not found'})
  let q=d.quizzes.find(x=>x.courseId===c.id); if(!q){q={id:`quiz-${c.id}`,courseId:c.id,title:`${c.title} Assessment`,questions:[]};d.quizzes.push(q)}
  const previous=d.quizAttempts.filter(a=>a.userId===req.user.id&&a.quizId===q.id).at(-1), previousIds=(previous?.questionIds||previous?.answers||[]).map(a=>typeof a==='string'?a:a?.questionId).filter(Boolean), selected=randomQuestions(q.questions,previousIds)
  if(!Array.isArray(d.quizSessions))d.quizSessions=[]
  d.quizSessions=d.quizSessions.filter(x=>!(x.userId===req.user.id&&x.quizId===q.id)); d.quizSessions.push({id:uuid(),userId:req.user.id,quizId:q.id,questionIds:selected.map(x=>x.id),createdAt:new Date().toISOString()}); await save(d)
  res.json({quiz:{id:q.id,courseId:q.courseId,title:q.title,questions:selected.map(({answer,...x})=>x)}})
})
app.get('/api/quizzes/:id',auth,role('student'),async(req,res)=>{
  const d=await read(),q=d.quizzes.find(x=>x.id===req.params.id); if(!q)return res.status(404).json({message:'Quiz not found'})
  if(!enrollmentFor(d,q.courseId,req.user.id))return res.status(403).json({message:'Enroll in this course to take its assessment'})
  const previous=d.quizAttempts.filter(a=>a.userId===req.user.id&&a.quizId===q.id).at(-1), previousIds=(previous?.questionIds||previous?.answers||[]).map(a=>typeof a==='string'?a:a?.questionId).filter(Boolean), selected=randomQuestions(q.questions,previousIds)
  if(!Array.isArray(d.quizSessions))d.quizSessions=[]
  d.quizSessions=d.quizSessions.filter(x=>!(x.userId===req.user.id&&x.quizId===q.id)); d.quizSessions.push({id:uuid(),userId:req.user.id,quizId:q.id,questionIds:selected.map(x=>x.id),createdAt:new Date().toISOString()}); await save(d)
  res.json({quiz:{id:q.id,courseId:q.courseId,title:q.title,questions:selected.map(({answer,...x})=>x)}})
})
app.post('/api/quizzes/:id/submit',auth,role('student'),async(req,res)=>{
  const d=await read(),q=d.quizzes.find(x=>x.id===req.params.id); if(!q)return res.status(404).json({message:'Quiz not found'})
  if(!enrollmentFor(d,q.courseId,req.user.id))return res.status(403).json({message:'Enroll in this course to take its assessment'})
  const session=[...(d.quizSessions||[])].reverse().find(x=>x.userId===req.user.id&&x.quizId===q.id)
  if(!session)return res.status(400).json({message:'Assessment expired. Load a new set of questions.'})
  const allowed=new Set(session.questionIds||[]), answers=Array.isArray(req.body.answers)?req.body.answers:[], selected=q.questions.filter(x=>allowed.has(x.id)), byId=new Map(selected.map(x=>[x.id,x])); let correct=0
  for(const item of answers){const question=byId.get(item?.questionId);if(question&&Number(item.answer)===Number(question.answer))correct++}
  const total=selected.length,score=Math.round(correct/(total||1)*100),attempt={id:uuid(),userId:req.user.id,quizId:q.id,score,maxScore:100,answers:answers.filter(x=>allowed.has(x?.questionId)),questionIds:selected.map(x=>x.id),submittedAt:new Date().toISOString()};d.quizAttempts.push(attempt);d.quizSessions=d.quizSessions.filter(x=>x.id!==session.id);d.notifications.unshift({id:uuid(),userId:req.user.id,title:'Quiz graded',description:`${q.title}: ${score}/100`,read:false,createdAt:new Date().toISOString()});await save(d);res.status(201).json({attempt,correct,total})
})

// Instructor MCQ question bank
app.get('/api/instructor/courses/:courseId/quiz',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.courseId,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});let q=d.quizzes.find(x=>x.courseId===c.id);if(!q){q={id:`quiz-${c.id}`,courseId:c.id,title:`${c.title} Assessment`,questions:[]};d.quizzes.push(q);await save(d)}res.json({quiz:q})})
app.post('/api/instructor/courses/:courseId/quiz/questions',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.courseId,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});let q=d.quizzes.find(x=>x.courseId===c.id);if(!q){q={id:`quiz-${c.id}`,courseId:c.id,title:`${c.title} Assessment`,questions:[]};d.quizzes.push(q)}const options=Array.isArray(req.body.options)?req.body.options.map(x=>String(x).trim()).filter(Boolean):[];const answer=Number(req.body.answer);if(!String(req.body.question||'').trim()||options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)return res.status(400).json({message:'Question, at least 2 options, and a valid correct answer are required'});const question={id:uuid(),question:String(req.body.question).trim(),options,answer};q.questions.push(question);await save(d);res.status(201).json({question})})
app.patch('/api/instructor/quizzes/questions/:questionId',auth,role('instructor'),async(req,res)=>{const d=await read(),found=d.quizzes.flatMap(q=>q.questions.map(question=>({q,question}))).find(x=>x.question.id===req.params.questionId);const c=found&&ownerCourse(d,found.q.courseId,req.user.id);if(!found||!c)return res.status(404).json({message:'Question not found'});const options=Array.isArray(req.body.options)?req.body.options.map(x=>String(x).trim()).filter(Boolean):found.question.options;const answer=req.body.answer===undefined?found.question.answer:Number(req.body.answer);if(options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)return res.status(400).json({message:'At least 2 options and a valid correct answer are required'});Object.assign(found.question,{question:req.body.question===undefined?found.question.question:String(req.body.question).trim(),options,answer});await save(d);res.json({question:found.question})})
app.delete('/api/instructor/quizzes/questions/:questionId',auth,role('instructor'),async(req,res)=>{const d=await read(),found=d.quizzes.flatMap(q=>q.questions.map(question=>({q,question}))).find(x=>x.question.id===req.params.questionId);const c=found&&ownerCourse(d,found.q.courseId,req.user.id);if(!found||!c)return res.status(404).json({message:'Question not found'});found.q.questions=found.q.questions.filter(x=>x.id!==req.params.questionId);await save(d);res.json({ok:true})})

// ---------- Instructor course CRUD ----------
app.get('/api/instructor/overview',auth,role('instructor'),async(req,res)=>{const d=await read(),cs=d.courses.filter(c=>c.instructorId===req.user.id),courseIds=new Set(cs.map(c=>c.id)),es=d.enrollments.filter(e=>courseIds.has(e.courseId)),subs=d.submissions.filter(s=>courseIds.has(s.courseId)),comments=d.comments.filter(c=>courseIds.has(c.courseId)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30);for(const c of cs){const ce=es.filter(e=>e.courseId===c.id);c.students=ce.length;c.lessonsCount=d.lessons.filter(l=>l.courseId===c.id).length;c.completion=Math.min(100,Math.max(0,Math.round(ce.reduce((n,e)=>n+Math.min(100,Math.max(0,Number(e.progress)||0)),0)/(ce.length||1))))}res.json({stats:{courses:cs.length,students:new Set(es.map(e=>e.userId)).size,submissionsPending:subs.filter(s=>s.status==='pending').length,completionRate:Math.min(100,Math.max(0,Math.round(es.reduce((n,e)=>n+Math.min(100,Math.max(0,Number(e.progress)||0)),0)/(es.length||1))))},courses:cs,gradingQueue:subs.filter(s=>s.status==='pending').map(s=>({...s,studentName:d.users.find(u=>u.id===s.userId)?.name||'Student',courseTitle:d.courses.find(c=>c.id===s.courseId)?.title||'Course'})),comments:comments.map(c=>({...c,studentName:d.users.find(u=>u.id===c.userId)?.name||c.userName||'Student',courseTitle:d.courses.find(x=>x.id===c.courseId)?.title||'Course',lessonTitle:d.lessons.find(x=>x.id===c.lessonId)?.title||'Course discussion'}))})})
app.get('/api/instructor/students',auth,role('instructor'),async(req,res)=>{
  const d=await read(), cs=d.courses.filter(c=>c.instructorId===req.user.id), courseIds=new Set(cs.map(c=>c.id))
  const rows=d.enrollments.filter(e=>courseIds.has(e.courseId)).map(e=>{
    const student=d.users.find(u=>u.id===e.userId), course=d.courses.find(c=>c.id===e.courseId)
    const totalLessons=d.lessons.filter(l=>l.courseId===e.courseId).length
    const completed=e.completedLessonIds?.length ?? e.completedLessons ?? 0
    const safeCompleted=Math.min(totalLessons,Math.max(0,completed)); const safeProgress=totalLessons?Math.min(100,Math.max(0,Math.round(safeCompleted/totalLessons*100))):0; return {id:e.id,studentId:e.userId,studentName:student?.name||'Student',studentEmail:student?.email||'',courseId:e.courseId,courseTitle:course?.title||'Course',progress:safeProgress,completedLessons:safeCompleted,totalLessons,lastLessonId:e.lastLessonId||null}
  })
  const students=[...new Map(rows.map(r=>[r.studentId,{id:r.studentId,name:r.studentName,email:r.studentEmail,courses:[]}])).values()]
  for(const student of students) student.courses=rows.filter(r=>r.studentId===student.id)
  res.json({students,rows})
})

app.get('/api/instructor/analytics',auth,role('instructor'),async(req,res)=>{
  const d=await read(), cs=d.courses.filter(c=>c.instructorId===req.user.id), courseIds=new Set(cs.map(c=>c.id))
  const enrollments=d.enrollments.filter(e=>courseIds.has(e.courseId))
  const courses=cs.map(c=>{
    const es=enrollments.filter(e=>e.courseId===c.id), lessons=d.lessons.filter(l=>l.courseId===c.id), assignments=d.assignments.filter(a=>a.courseId===c.id)
    return {id:c.id,title:c.title,students:es.length,completion:Math.min(100,Math.max(0,Math.round(es.reduce((n,e)=>n+Math.min(100,Math.max(0,Number(e.progress)||0)),0)/(es.length||1)))),lessons:lessons.length,assignments:assignments.length,published:!!c.published}
  })
  const distribution={notStarted:enrollments.filter(e=>(e.progress||0)===0).length,inProgress:enrollments.filter(e=>(e.progress||0)>0&&(e.progress||0)<100).length,completed:enrollments.filter(e=>(e.progress||0)>=100).length}
  res.json({courses,distribution,totalStudents:new Set(enrollments.map(e=>e.userId)).size,totalEnrollments:enrollments.length,averageCompletion:Math.min(100,Math.max(0,Math.round(enrollments.reduce((n,e)=>n+Math.min(100,Math.max(0,Number(e.progress)||0)),0)/(enrollments.length||1))))})
})

app.get('/api/instructor/courses/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.id,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});res.json({course:c,lessons:d.lessons.filter(l=>l.courseId===c.id).sort((a,b)=>a.order-b.order),assignments:d.assignments.filter(a=>a.courseId===c.id),quizzes:d.quizzes.filter(q=>q.courseId===c.id)})})
app.post('/api/instructor/courses',auth,role('instructor'),async(req,res)=>{const d=await read(),c={id:uuid(),title:String(req.body.title||'Untitled Course'),description:String(req.body.description||''),category:req.body.category||'Development',level:req.body.level||'Beginner',durationHours:Number(req.body.durationHours)||10,published:!!req.body.published,instructorId:req.user.id,instructor:req.user.name,image:req.body.image||'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop'};d.courses.push(c);await save(d);res.status(201).json({course:c})})
app.patch('/api/instructor/courses/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.id,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});for(const k of ['title','description','category','level','durationHours','published','image'])if(req.body[k]!==undefined)c[k]=req.body[k];await save(d);res.json({course:c})})
app.delete('/api/instructor/courses/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.id,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});const lessonIds=d.lessons.filter(l=>l.courseId===c.id).map(l=>l.id);for(const l of d.lessons.filter(l=>lessonIds.includes(l.id))){if(l.videoUrl?.startsWith('/uploads/'))fs.unlink(path.join(UPLOADS,path.basename(l.videoUrl))).catch(()=>{})}d.courses=d.courses.filter(x=>x.id!==c.id);d.lessons=d.lessons.filter(x=>x.courseId!==c.id);const assignmentIds=new Set(d.assignments.filter(x=>x.courseId===c.id).map(x=>x.id));const quizIds=new Set(d.quizzes.filter(x=>x.courseId===c.id).map(x=>x.id));d.assignments=d.assignments.filter(x=>x.courseId!==c.id);d.submissions=d.submissions.filter(x=>!assignmentIds.has(x.assignmentId)&&x.courseId!==c.id);d.quizzes=d.quizzes.filter(x=>x.courseId!==c.id);d.quizAttempts=d.quizAttempts.filter(x=>!quizIds.has(x.quizId));d.quizSessions=d.quizSessions.filter(x=>!quizIds.has(x.quizId));d.enrollments=d.enrollments.filter(x=>x.courseId!==c.id);d.comments=d.comments.filter(x=>x.courseId!==c.id);d.notes=d.notes.filter(x=>x.courseId!==c.id);d.certificates=d.certificates.filter(x=>x.courseId!==c.id);await save(d);res.json({ok:true})})

// ---------- Lesson / video CRUD ----------
app.post('/api/instructor/courses/:courseId/lessons',auth,role('instructor'),upload.single('video'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.courseId,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});const lesson={id:uuid(),courseId:c.id,title:String(req.body.title||'New Lesson'),order:d.lessons.filter(l=>l.courseId===c.id).length+1,duration:req.body.duration||'10:00',description:req.body.description||'',videoUrl:req.file?`/uploads/${req.file.filename}`:(req.body.videoUrl||'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),resources:[]};d.lessons.push(lesson);await save(d);res.status(201).json({lesson})})
app.patch('/api/instructor/lessons/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),l=d.lessons.find(x=>x.id===req.params.id),c=l&&ownerCourse(d,l.courseId,req.user.id);if(!l||!c)return res.status(404).json({message:'Lesson not found'});for(const k of ['title','duration','description','videoUrl','order'])if(req.body[k]!==undefined)l[k]=req.body[k];await save(d);res.json({lesson:l})})
app.post('/api/instructor/lessons/:id/video',auth,role('instructor'),upload.single('video'),async(req,res)=>{const d=await read(),l=d.lessons.find(x=>x.id===req.params.id),c=l&&ownerCourse(d,l.courseId,req.user.id);if(!l||!c)return res.status(404).json({message:'Lesson not found'});if(!req.file)return res.status(400).json({message:'Video file required'});if(l.videoUrl?.startsWith('/uploads/'))fs.unlink(path.join(UPLOADS,path.basename(l.videoUrl))).catch(()=>{});l.videoUrl=`/uploads/${req.file.filename}`;await save(d);res.json({lesson:l})})
app.delete('/api/instructor/lessons/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),i=d.lessons.findIndex(x=>x.id===req.params.id),l=d.lessons[i],c=l&&ownerCourse(d,l.courseId,req.user.id);if(i<0||!c)return res.status(404).json({message:'Lesson not found'});if(l.videoUrl?.startsWith('/uploads/'))fs.unlink(path.join(UPLOADS,path.basename(l.videoUrl))).catch(()=>{});d.lessons.splice(i,1);d.lessons.filter(x=>x.courseId===c.id).sort((a,b)=>a.order-b.order).forEach((x,n)=>x.order=n+1);d.comments=d.comments.filter(x=>x.lessonId!==l.id);d.notes=d.notes.filter(x=>x.lessonId!==l.id);for(const e of d.enrollments.filter(x=>x.courseId===c.id)){e.completedLessonIds=(e.completedLessonIds||[]).filter(id=>id!==l.id);const total=d.lessons.filter(x=>x.courseId===c.id).length;e.completedLessons=e.completedLessonIds.length;e.progress=total?Math.min(100,Math.max(0,Math.round(e.completedLessons/total*100))):0;e.status=e.progress>=100?'completed':e.progress>0?'in_progress':'not_started';if(e.lastLessonId===l.id)e.lastLessonId=null}await save(d);res.json({ok:true})})

// ---------- Resources ----------
app.post('/api/instructor/lessons/:lessonId/resources',auth,role('instructor'),async(req,res)=>{const d=await read(),l=d.lessons.find(x=>x.id===req.params.lessonId),c=l&&ownerCourse(d,l.courseId,req.user.id);if(!l||!c)return res.status(404).json({message:'Lesson not found'});const r={id:uuid(),name:String(req.body.name||'Resource'),url:String(req.body.url||'#'),type:req.body.type||'link'};l.resources=[...(l.resources||[]),r];await save(d);res.status(201).json({resource:r})})
app.delete('/api/instructor/lessons/:lessonId/resources/:resourceId',auth,role('instructor'),async(req,res)=>{const d=await read(),l=d.lessons.find(x=>x.id===req.params.lessonId),c=l&&ownerCourse(d,l.courseId,req.user.id);if(!l||!c)return res.status(404).json({message:'Lesson not found'});l.resources=(l.resources||[]).filter(r=>r.id!==req.params.resourceId);await save(d);res.json({ok:true})})

// ---------- Assignments ----------
app.post('/api/instructor/courses/:courseId/assignments',auth,role('instructor'),async(req,res)=>{const d=await read(),c=ownerCourse(d,req.params.courseId,req.user.id);if(!c)return res.status(404).json({message:'Course not found'});const a={id:uuid(),courseId:c.id,title:String(req.body.title||'Assignment'),description:String(req.body.description||''),dueAt:req.body.dueAt||null,status:'pending'};d.assignments.push(a);await save(d);res.status(201).json({assignment:a})})
app.patch('/api/instructor/assignments/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),a=d.assignments.find(x=>x.id===req.params.id),c=a&&ownerCourse(d,a.courseId,req.user.id);if(!a||!c)return res.status(404).json({message:'Assignment not found'});Object.assign(a,{title:req.body.title??a.title,description:req.body.description??a.description,dueAt:req.body.dueAt??a.dueAt});await save(d);res.json({assignment:a})})
app.delete('/api/instructor/assignments/:id',auth,role('instructor'),async(req,res)=>{const d=await read(),a=d.assignments.find(x=>x.id===req.params.id),c=a&&ownerCourse(d,a.courseId,req.user.id);if(!a||!c)return res.status(404).json({message:'Assignment not found'});d.assignments=d.assignments.filter(x=>x.id!==a.id);d.submissions=d.submissions.filter(x=>x.assignmentId!==a.id);await save(d);res.json({ok:true})})
app.post('/api/assignments/:id/submit',auth,role('student'),async(req,res)=>{const d=await read(),a=d.assignments.find(x=>x.id===req.params.id),en=d.enrollments.find(e=>e.userId===req.user.id&&e.courseId===a?.courseId);if(!a||!en)return res.status(404).json({message:'Assignment not found or not enrolled'});let s=d.submissions.find(x=>x.assignmentId===a.id&&x.userId===req.user.id);if(!s){s={id:uuid(),assignmentId:a.id,courseId:a.courseId,userId:req.user.id,assignmentTitle:a.title,status:'pending',answer:'',submittedAt:null};d.submissions.push(s)}s.answer=String(req.body.answer||'');s.submittedAt=new Date().toISOString();s.status='pending';await save(d);res.json({submission:s})})
app.post('/api/instructor/submissions/:id/grade',auth,role('instructor'),async(req,res)=>{const d=await read(),s=d.submissions.find(x=>x.id===req.params.id),c=s&&ownerCourse(d,s.courseId,req.user.id);if(!s||!c)return res.status(404).json({message:'Submission not found'});if(req.body.score===undefined||req.body.score==='')return res.status(400).json({message:'Score is required'});const numeric=Number(req.body.score);if(!Number.isFinite(numeric)||numeric<0||numeric>100)return res.status(400).json({message:'Score must be between 0 and 100'});s.score=Math.round(numeric);s.feedback=String(req.body.feedback||'').trim();s.status='done';s.gradedAt=new Date().toISOString();s.remarksProvided=Boolean(s.feedback);d.notifications.unshift({id:uuid(),userId:s.userId,title:'Assignment checked',description:s.feedback?`${s.assignmentTitle}: ${s.score}/100 — ${s.feedback}`:`${s.assignmentTitle}: ${s.score}/100 — No remarks provided`,read:false,createdAt:new Date().toISOString()});await save(d);res.json({submission:s})})

// ---------- Notifications / certificates ----------
app.patch('/api/notifications/:id/read',auth,async(req,res)=>{const d=await read(),n=d.notifications.find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!n)return res.status(404).json({message:'Notification not found'});n.read=true;await save(d);res.json({notification:n})})
app.post('/api/notifications/read-all',auth,async(req,res)=>{const d=await read();d.notifications.filter(n=>n.userId===req.user.id).forEach(n=>n.read=true);await save(d);res.json({ok:true})})
app.get('/api/certificates',auth,async(req,res)=>{const d=await read();res.json({certificates:d.certificates.filter(c=>c.userId===req.user.id)})})
app.post('/api/certificates',auth,async(req,res)=>{const d=await read(),course=d.courses.find(c=>c.id===req.body.courseId),e=d.enrollments.find(x=>x.userId===req.user.id&&x.courseId===req.body.courseId);if(!course||!e||e.progress<100)return res.status(400).json({message:'Complete the course first'});let c=d.certificates.find(x=>x.userId===req.user.id&&x.courseId===course.id);if(!c){c={id:uuid(),userId:req.user.id,courseId:course.id,courseTitle:course.title,studentName:req.user.name,issuedAt:new Date().toISOString()};d.certificates.push(c);await save(d)}res.json({certificate:c})})

app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:'Internal server error'})})

async function boot(){
  const d=await read();
  for(const key of ['notes','comments','submissions','certificates','notifications','assignments','quizAttempts','quizSessions','quizzes','lessons','enrollments'])if(!Array.isArray(d[key]))d[key]=[];
  for(const u of d.users)if(!u.passwordHash)u.passwordHash=await bcrypt.hash('password123',10);
  for(const e of d.enrollments){
    const courseLessons=d.lessons.filter(l=>l.courseId===e.courseId);
    const validLessonIds=new Set(courseLessons.map(l=>l.id));
    let completedIds=Array.isArray(e.completedLessonIds)?e.completedLessonIds.filter(id=>validLessonIds.has(id)) : [];
    if(!completedIds.length && Number(e.completedLessons)>0)completedIds=courseLessons.slice(0,Math.min(courseLessons.length,Number(e.completedLessons)||0)).map(l=>l.id);
    e.completedLessonIds=[...new Set(completedIds)];
    e.completedLessons=e.completedLessonIds.length;
    const total=courseLessons.length;
    e.progress=total===0?0:Math.min(100,Math.max(0,Math.round(e.completedLessons/total*100)));
    if(e.progress>=100){e.progress=100;e.status='completed'}
    else if(e.progress>0)e.status='in_progress';
    else e.status='not_started';
  }
  for(const e of d.enrollments){
    if(e.progress>=100 && !d.certificates.some(c=>c.userId===e.userId&&c.courseId===e.courseId)){
      const course=d.courses.find(c=>c.id===e.courseId), student=d.users.find(u=>u.id===e.userId)
      if(course && student)d.certificates.push({id:uuid(),userId:e.userId,courseId:e.courseId,courseTitle:course.title,studentName:student.name,issuedAt:e.completedAt||new Date().toISOString()})
    }
  }
  for(const l of d.lessons){if(!l.videoUrl)l.videoUrl='https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';if(!Array.isArray(l.resources))l.resources=[]}
  for(const c of d.comments){if(c.lessonId===undefined)c.lessonId=null}
  for(const s of d.submissions){if(s.status==='graded')s.status='done';s.feedback=String(s.feedback||'');s.remarksProvided=Boolean(s.feedback)}
  await save(d);
  app.listen(PORT,()=>console.log(`Skillbridge API running at http://localhost:${PORT}`))
}
boot()
