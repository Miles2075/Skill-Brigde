import {
  FormEvent,
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  use,
} from "react";
import { api, clearToken, setToken } from "./api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor";
};
type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: string;
  durationHours: number;
  published: boolean;
  image?: string;
  progress?: number;
  completed?: boolean;
  completedLessons?: number;
  lastLessonId?: string;
};
type Lesson = {
  id: string;
  courseId: string;
  title: string;
  order: number;
  duration?: string;
  videoUrl: string;
  description?: string;
  resources?: any[];
};
type Screen =
  "dashboard" | "courses" | "player" | "quiz" | "progress" | "instructor" | "assignments";
const imgs = [
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1000&auto=format&fit=crop",
];
function safeProgress(value?: number) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string; 
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}
function Page({ children }: { children: any }) {
  return (
    <>
      <style>{`
        /* Animated background gradient */
        @keyframes skillbridgeGradient {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }

        /* Moving futuristic grid */
        @keyframes futuristicGrid {
          0% {
            background-position: 0 0;
          }

          100% {
            background-position: 50px 50px;
          }
        }
      `}</style>

      <main
        className="relative pt-16 min-h-screen overflow-hidden bg-gradient-to-br from-red-100 via-teal-700 to-amber-300 bg-[length:200%_200%]"
        style={{
          animation: "skillbridgeGradient 15s ease infinite",
        }}
      >

        {/* Animated Futuristic Grid */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-7"
            style={{
              backgroundImage: `
                linear-gradient(
                  rgba(225, 237, 235, 0.6) 19px,
                  transparent 26px
                ),
                linear-gradient(
                    30deg,
                  rgba(255, 0, 43, 0.55) 19px,
                  transparent 29px
                )
              `,
              backgroundSize: "50px 50px",
              animation: "futuristicGrid 5s linear infinite",
            }}
          />
        </div>

        {/* Page Content */}
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
          {children}
        </div>

      </main>
    </>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: any;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm p-4 grid place-items-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-white/70">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Skillbridge
            </p>
            <h2 className="text-xl font-bold mt-1">{title}</h2>
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("alex@example.com"),
    [password, setPassword] = useState("password123"),
    [name, setName] = useState(""),
    [register, setRegister] = useState(false),
    [role, setRole] = useState<"student" | "instructor">("student"),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  function toggleMode() {
    setRegister((v) => !v);
    setErr("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = register
        ? { name: name.trim(), email: email.trim(), password, role }
        : { email: email.trim(), password };
      const r = await api<any>(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(r.token);
      onLogin(r.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50/60 p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/50"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white grid place-items-center text-xl shadow-lg shadow-purple-200">
            ▲
          </div>
          <div>
            <b className="text-2xl">Skillbridge</b>
            <p className="text-slate-500">Learning Platform</p>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          {register ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-slate-500 mt-2 mb-6">
          {register
            ? "Choose how you will use Skillbridge."
            : "Sign in to continue learning."}
        </p>
        {register && (
          <>
            <div className="mb-5">
              <span className="block text-sm font-semibold mb-2">
                Register as
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    [
                      "student",
                      "🎓",
                      "Student",
                      "Learn courses and submit assignments",
                    ],
                    [
                      "instructor",
                      "👨‍🏫",
                      "Instructor",
                      "Create courses and teach students",
                    ],
                  ] as const
                ).map(([value, icon, title, desc]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`text-left rounded-2xl border-2 p-3 transition ${role === value ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <b>{title}</b>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-4">
                      {desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <Field
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Alex Morgan"
              />
            </div>
          </>
        )}
        <div className="mb-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />
        </div>
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
        />
        {register && (
          <p className="text-xs text-slate-500 mt-2">
            {role === "instructor"
              ? "Instructor accounts can create and manage courses, lessons and assignments."
              : "Student accounts can enroll in courses, learn and submit assignments."}
          </p>
        )}
        {err && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {err}
          </div>
        )}
        <button
          disabled={busy}
          className="w-full mt-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 transition"
        >
          {busy
            ? register
              ? "Creating account…"
              : "Signing in…"
            : register
              ? "Create Account →"
              : "Sign In →"}
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="w-full mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          {register
            ? "Already have an account? Sign in"
            : "Create a new account"}
        </button>
        <div className="mt-5 p-3 rounded-xl bg-slate-100 text-sm text-slate-600">
          Demo student: alex@example.com / password123
          <br />
          Demo instructor: sarah@example.com / password123
        </div>
      </form>
    </div>
  );
}
function Nav({
  screen,
  setScreen,
  user,
  onLogout,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  user: User;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const studentNav: [Screen, string][] = [
    ["dashboard", "Dashboard"],
    ["courses", "Courses"],
    ["player", "Course Player"],
    ["quiz", "Assessment"],
    ["assignments", "Assignments"],
    ["progress", "My Progress"],
  ];

  const instructorNav: [Screen, string][] = [
    ["instructor", "Instructor"],
    ["courses", "Courses"],
    ["player", "Course Player"],
  ];

  const items =
    user.role === "instructor" ? instructorNav : studentNav;

  const handleNavigation = (s: Screen) => {
    setScreen(s);
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">

      <div className="h-16 flex items-center px-3 sm:px-5">

        <button
          onClick={() =>
            handleNavigation(
              user.role === "instructor" ? "instructor" : "dashboard"
            )
          }
          className="font-bold text-lg sm:text-xl whitespace-nowrap shrink-0"
        >
          📔 <span className="text-lime-600">Skillbridge</span>
        </button>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {items.map(([s, label]) => (
            <button
              key={s}
              onClick={() => handleNavigation(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                screen === s
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-teal-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex ml-auto items-center gap-2 sm:gap-3">
          <span className="text-sm text-slate-500">
            {user.name}
          </span>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
            {user.role}
          </span>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm transition"
          >
            Logout
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden ml-auto w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xl transition"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white shadow-lg">
          <div className="p-3 space-y-1">

            {items.map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => handleNavigation(s)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                  screen === s
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}

            <div className="border-t border-slate-200 mt-2 pt-3">
              <div className="px-4 py-2">
                <p className="font-semibold text-slate-800">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 capitalize mt-1">
                  {user.role}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Dashboard({
  user,
  setScreen,
  setCourse,
  setCourseFilter,
  setProgressFocus,
}: {
  user: User;
  setScreen: (s: Screen) => void;
  setCourse: (id: string) => void;
  setCourseFilter: (v: "all" | "enrolled") => void;
  setProgressFocus: (v: "none" | "hours" | "certificates") => void;
}) {
  const [data, setData] = useState<any>();
  const [err, setErr] = useState("");
  const load = () =>
    api<any>("/dashboard")
      .then(setData)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);
  const hour = new Date().getHours();

  const greeting = 
  hour < 12 
  ?"Morning"
  : hour < 18
     ?"Afternoon"
     : "Evening"

  if (!data)
    return (
      <Page>
        {err ? (
          <div className="text-red-600">{err}</div>
        ) : (
          <div>Loading dashboard…</div>
        )}
      </Page>
    );
  return (
    <Page>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white transition-all duration-500"
            style={{
             textShadow: "0 0 4px rgba(6, 6, 6, 0.9), 0 2px 8px rgba(241, 22, 146, 0.7)"
            }}
            >
            Good {greeting}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-white mt-1 transition-all duration-500"
          style={{
            textShadow: "0 0 4px rgba(33, 33, 33, 0.9), 0 2px 8px rgba(205, 9, 149, 0.92)"
          }}>
            Your learning activity and upcoming work.
          </p>
        </div>
        <button
          onClick={() => setScreen("courses")}
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold"
        >
          Browse Courses
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          [
            "📚",
            data.stats.coursesEnrolled,
            "Courses Enrolled",
            () => {
              setCourseFilter("enrolled");
              setScreen("courses");
            },
          ],
          [
            "⏱️",
            data.stats.hoursThisWeek + "h",
            "Hours This Week",
            () => {
              setProgressFocus("hours");
              setScreen("progress");
            },
          ],
          [
            "🎯",
            data.stats.avgQuizScore + "%",
            "Avg Quiz Score",
            () => {
              setScreen("quiz");
            },
          ],
          [
            "🏆",
            data.stats.certificates,
            "Certificates",
            () => {
              setProgressFocus("certificates");
              setScreen("progress");
            },
          ],
        ].map(([icon, value, label, action]: any) => (
 <button
  type="button"
  key={label}
  onClick={action}
  className="relative text-left rounded-2xl p-[3px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-600"
>
  <div
    className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#0d9488,#8b5cf6,#6366f1,#10b981)] blur-md opacity-70"
  />

  <div
       className="absolute inset-[-100%] animate-[spin_2.5s_linear_infinite} bg-[conic-gradient(from_0deg,#0d9488,#8b5cf6,6366f1,#10b981])"/>
  <div className="relative z-10 h-full rounded-[14px] bg-white p-5 hover:-translate-y-0.5 hover:shadow-md transition">
    <span className="text-2xl">{icon}</span>

    <b className="block text-3xl mt-2">{value}</b>

    <span className="text-sm text-slate-500">{label}</span>

    <span className="block text-xs text-indigo-600 font-semibold mt-3">
      View details →
    </span>
  </div>
</button>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">My Courses</h2>
        <button
          onClick={() => setScreen("courses")}
          className="text-pink-950"
        >
          View all →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {data.courses.map((c: Course, i: number) => {
          const progress = safeProgress(c.progress);
          const done = Boolean(c.completed || progress >= 100);
          return (
            <div
              className="bg-white border rounded-2xl overflow-hidden"
              key={c.id}
            >
              <div className="relative">
                <img
                  src={c.image || imgs[i % imgs.length]}
                  className="w-full h-44 object-cover"
                />
                {done && (
                  <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                    ✓ Completed
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between">
                  <h3 className="font-bold">{c.title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-900 text-white"}`}
                  >
                    {done ? "Completed" : progress + "%"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">by {c.instructor}</p>
                <div className="h-2 bg-slate-100 rounded-full mt-5">
                  <div
                    className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-indigo-600"}`}
                    style={{ width: `${done ? 100 : progress}%` }}
                  />
                </div>
                <button
                  onClick={() => {
                    setCourse(c.id);
                    setScreen("player");
                  }}
                  className={`w-full mt-4 py-2.5 rounded-xl font-semibold ${done ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-600"}`}
                >
                  {done ? "Rewatch →" : "Resume →"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 bg-white border rounded-2xl p-5">
        <h2 className="font-bold mb-4">Assignments</h2>
        {data.assignments.length ? (
          data.assignments.map((a: any) => (
            <div
              key={a.id}
              className="flex flex-col md:flex-row md:items-center gap-3 py-3 border-b last:border-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <b>{a.title}</b>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${a.submissionStatus === "done" ? "bg-emerald-50 text-emerald-700" : a.submissionStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {a.submissionStatus === "done"
                      ? "Done"
                      : a.submissionStatus === "pending"
                        ? "Submitted"
                        : "Not submitted"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Due:{" "}
                  {a.dueAt ? new Date(a.dueAt).toLocaleString() : "No due date"}
                </p>
                {a.submissionStatus === "done" && (
                  <p className="text-xs text-slate-600 mt-1">
                    Score {a.score}/100 ·{" "}
                    {a.remarksProvided ? a.feedback : "No remarks provided."}
                  </p>
                )}
              </div>
              <button
                onClick={() => setScreen("assignments")}
                className="px-3 py-2 rounded-lg bg-slate-100 text-sm"
              >
                {a.submissionStatus === "done" ? "View result" : "Open"}
              </button>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No assignments.</p>
        )}
      </div>
    </Page>
  );
}

function Courses({
  setCourse,
  setScreen,
  user,
  courseFilter = "all",
}: {
  setCourse: (id: string) => void;
  setScreen: (s: Screen) => void;
  user: User;
  courseFilter?: "all" | "enrolled";
}) {
  const [courses, setCourses] = useState<Course[]>([]),
    [search, setSearch] = useState(""),
    [msg, setMsg] = useState("");
  async function load(q = "") {
    try {
      const r =
        user.role === "instructor"
          ? await api<any>("/instructor/overview")
          : await api<any>(
              "/courses" + (q ? `?search=${encodeURIComponent(q)}` : ""),
            );
      let list = r.courses || [];
      if (user.role === "student") {
        const d: any = await api<any>("/dashboard").catch(() => ({
          courses: [],
        }));
        const progressById = new Map(
          (d.courses || []).map((c: any) => [c.id, c]),
        );
        list = list.map((c: any) => {
          const extra: any = progressById.get(c.id) || {};
          return { ...c, ...extra };
        });
        if (courseFilter === "enrolled")
          list = list.filter((c: any) => progressById.has(c.id));
      } else if (q)
        list = list.filter((c: any) =>
          `${c.title} ${c.description} ${c.category} ${c.level}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        );
      setCourses(list);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load courses");
    }
  }
  useEffect(() => {
    load();
  }, [user.role, courseFilter]);
  async function enroll(id: string) {
    try {
      await api(`/courses/${id}/enroll`, { method: "POST" });
      setMsg("Enrolled successfully ✓");
      await load(search);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Enrollment failed");
    }
  }
  return (
    <Page>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {user.role === "instructor"
              ? "My Courses"
              : courseFilter === "enrolled"
                ? "My Enrolled Courses"
                : "Course Library"}
          </h1>
          <p className="text-black-500 mt-1">
            {user.role === "instructor"
              ? "Manage and preview the courses you teach."
              : courseFilter === "enrolled"
                ? "Continue the courses you are enrolled in."
                : "Explore published courses and start learning."}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search courses…"
          className="w-full md:w-80 border rounded-xl px-4 py-3"
        />
      </div>
      {msg && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl">
          {msg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {courses.map((c: any, i: number) => {
          const enrolled = user.role === "student" && c.progress !== undefined;
          const progress = safeProgress(c.progress);
          const done = enrolled && Boolean(c.completed || progress >= 100);
          return (
            <div
              key={c.id}
              className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <div className="relative">
                <img
                  src={c.image || imgs[i % imgs.length]}
                  className="h-44 w-full object-cover"
                />
                {done && (
                  <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                    ✓ Completed
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex gap-2 text-xs mb-2">
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                    {c.category}
                  </span>
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {c.level}
                  </span>
                  {user.role === "instructor" && (
                    <span
                      className={`px-2 py-1 rounded ${c.published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {c.published ? "Published" : "Draft"}
                    </span>
                  )}
                  {done && (
                    <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{c.title}</h2>
                <p className="text-sm text-slate-500 mt-2 min-h-10">
                  {c.description}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  {c.durationHours} hours · {c.instructor}
                </p>
                {user.role === "student" && enrolled && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{done ? "Course completed" : "Your progress"}</span>
                      <b>{done ? 100 : progress}%</b>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-indigo-600"}`}
                        style={{ width: `${done ? 100 : progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <button
                    onClick={() => {
                      setCourse(c.id);
                      setScreen("player");
                    }}
                    className={`${user.role === "instructor" || enrolled ? "w-full" : "flex-1"} py-2.5 rounded-xl bg-slate-100 font-semibold hover:bg-indigo-50 hover:text-indigo-600`}
                  >
                    {user.role === "instructor"
                      ? "Preview course"
                      : done
                        ? "Rewatch course"
                        : "View course"}
                  </button>
                  {user.role === "student" && !enrolled && (
                    <button
                      onClick={() => enroll(c.id)}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!courses.length && (
        <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-slate-500">
          {user.role === "instructor"
            ? "You have not created any courses yet."
            : "No courses found."}
        </div>
      )}
    </Page>
  );
}

function CoursePlayer({
  courseId,
  setScreen,
  user,
}: {
  courseId: string;
  setScreen: (s: Screen) => void;
  user: User;
}) {
  const [data, setData] = useState<any>(),
    [idx, setIdx] = useState(0),
    [note, setNote] = useState(""),
    [comments, setComments] = useState<any[]>([]),
    [comment, setComment] = useState(""),
    [saved, setSaved] = useState(""),
    [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  async function load() {
    if (!courseId) {
      setError("No course selected. Open Courses and choose a course first.");
      return;
    }
    try {
      setError("");
      const r = await api<any>(`/courses/${courseId}/player`);
      setData(r);
      const lessons = r.lessons || [];
      const selected = lessons.length
        ? lessons[Math.min(idx, lessons.length - 1)]
        : null;
      if (selected) {
        const n = await api<any>(
          `/courses/${courseId}/lessons/${selected.id}/notes`,
        ).catch(() => ({ note: { body: "" } }));
        setNote(n.note?.body || "");
        const cr = await api<any>(
          `/courses/${courseId}/comments?lessonId=${encodeURIComponent(selected.id)}`,
        ).catch(() => ({ comments: [] }));
        setComments(cr.comments || []);
      } else {
        setNote("");
        setComments([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load course");
    }
  }
  useEffect(() => {
    setIdx(0);
    load();
  }, [courseId]);
  useEffect(() => {
    const l = data?.lessons?.[idx];
    if (l)
      api<any>(`/courses/${courseId}/lessons/${l.id}/notes`)
        .then((r) => setNote(r.note?.body || ""))
        .catch(() => setNote(""));
  }, [idx, data, courseId]);
  useEffect(() => {
    const l = data?.lessons?.[idx];
    if (l)
      api<any>(
        `/courses/${courseId}/comments?lessonId=${encodeURIComponent(l.id)}`,
      )
        .then((r) => setComments(r.comments || []))
        .catch(() => setComments([]));
  }, [idx, data, courseId]);
  if (!data)
    return (
      <Page>
        {error ? (
          <div className="max-w-xl mx-auto bg-white border rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="font-bold text-xl">Course player unavailable</h1>
            <p className="text-slate-500 mt-2">{error}</p>
          </div>
        ) : (
          <div>Loading course…</div>
        )}
      </Page>
    );
  const lessons = data.lessons || [],
    l = lessons[idx];
  const videoUrl = l?.videoUrl?.startsWith("/")
    ? `${window.location.origin}${l.videoUrl}`
    : l?.videoUrl;
  async function complete() {
    if (!l?.id)
      return setSaved("This course does not have a lesson selected yet.");
    try {
      const r = await api<any>(
        `/courses/${courseId}/lessons/${l.id}/complete`,
        { method: "POST" },
      );
      setSaved(
        r.completed
          ? "Course completed 🎉 You can rewatch it anytime."
          : "Progress saved ✓",
      );
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Could not save progress");
    }
  }
  async function saveNote() {
    if (!l?.id) return setSaved("Add or select a lesson before saving notes.");
    try {
      await api(`/courses/${courseId}/lessons/${l.id}/notes`, {
        method: "PUT",
        body: JSON.stringify({ body: note }),
      });
      setSaved("Note saved ✓");
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Could not save note");
    }
  }
  async function post() {
    if (!l?.id) return setSaved("Select a lesson before commenting.");
    if (!comment.trim()) return;
    try {
      const r = await api<any>(`/courses/${courseId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment.trim(), lessonId: l.id }),
      });
      setComments([...comments, r.comment]);
      setComment("");
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Could not post comment");
    }
  }
  return (
    <Page>
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-indigo-600">COURSE PLAYER</p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">{data.course.title}</h1>
          <p className="text-sm text-black-500 mt-1">
            Learn at your pace with lessons, notes and discussion.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
        </div>
      </div>
      {lessons.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-5">
          <div className="bg-white border rounded-2xl p-8 min-h-96 grid place-items-center text-center">
            <div>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center text-3xl">
                🎬
              </div>
              <h2 className="text-xl font-bold mt-4">
                No lessons available yet
              </h2>
              <p className="text-slate-500 mt-2 max-w-md">
                This course has been created, but the instructor has not added
                any lesson content yet.
              </p>
              <button
                onClick={() =>
                  setScreen(
                    user.role === "instructor" ? "instructor" : "courses",
                  )
                }
                className="mt-5 px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold"
              >
                {user.role === "instructor"
                  ? "Back to Instructor"
                  : "Browse Courses"}
              </button>
            </div>
          </div>
          <aside className="bg-white border rounded-2xl p-5 h-fit">
            <h2 className="font-bold">Course Content</h2>
            <p className="text-sm text-slate-500 mt-3">
              No lessons have been added to this course.
            </p>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-5">
          <div>
            <div className="bg-black rounded-2xl overflow-hidden shadow-sm">
              <video
                ref={video}
                src={videoUrl}
                controls
                className="w-full aspect-video"
                onEnded={user.role === "student" ? complete : undefined}
              />
            </div>
            <div className="bg-white border rounded-2xl p-5 mt-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{l.title}</h1>
                  <p className="text-slate-500 mt-1">
                    {l.description || data.course.title}
                  </p>
                  {user.role === "instructor" && (
                    <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                      Instructor preview
                    </span>
                  )}
                </div>
                {user.role === "student" && (
                  <button
                    onClick={complete}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold whitespace-nowrap"
                  >
                    Mark complete
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {[0.75, 1, 1.25, 1.5, 2].map((x) => (
                  <button
                    key={x}
                    onClick={() => {
                      if (video.current) video.current.playbackRate = x;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {x}×
                  </button>
                ))}
                <button
                  onClick={() => video.current?.requestFullscreen()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Fullscreen
                </button>
              </div>
              {user.role === "student" && (
                <>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full border rounded-xl p-3 mt-5 min-h-28"
                    placeholder="Write your lesson notes…"
                  />
                  <button
                    onClick={saveNote}
                    className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white"
                  >
                    Save note
                  </button>
                </>
              )}
            </div>
            <div className="bg-white border rounded-2xl p-5 mt-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-bold">Discussion</h2>
                {user.role === "instructor" && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                    Instructor view
                  </span>
                )}
              </div>
              {user.role === "student" && (
                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1 border rounded-xl px-3"
                    placeholder="Add a comment…"
                  />
                  <button
                    onClick={post}
                    className="px-4 rounded-xl bg-indigo-600 text-white"
                  >
                    Post
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {comments.length ? (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <b className="text-sm">{c.userName}</b>
                        <span className="text-[11px] text-slate-400">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{c.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-3">
                    No comments on this lesson yet.
                  </p>
                )}
              </div>
            </div>
          </div>
          <aside className="bg-white border rounded-2xl p-4 h-fit sticky top-20">
            <h2 className="font-bold mb-3">Course Content</h2>
            {lessons.map((x: any, i: number) => (
              <button
                key={x.id}
                onClick={() => setIdx(i)}
                className={`w-full text-left p-3 rounded-xl mb-1 ${i === idx ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${i === idx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <b className="text-sm block">{x.title}</b>
                    <span className="block text-xs text-slate-400 mt-1">
                      {x.duration || "Video lesson"}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </aside>
        </div>
      )}
      {saved && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg">
          {saved}
        </div>
      )}
    </Page>
  );
}

function Quiz() {
  const [courses, setCourses] = useState<any[]>([]),
    [courseId, setCourseId] = useState(""),
    [quiz, setQuiz] = useState<any>(),
    [i, setI] = useState(0),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [result, setResult] = useState<any>(),
    [err, setErr] = useState(""),
    [loading, setLoading] = useState(true);
  async function loadCourses() {
    try {
      const d = await api<any>("/dashboard");
      const cs = d.courses || [];
      setCourses(cs);
      if (cs.length && !courseId) setCourseId(cs[0].id);
      return cs;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load courses");
      return [];
    }
  }
  async function loadQuiz(id = courseId) {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const r = await api<any>(`/quizzes/course/${id}`);
      setQuiz(r.quiz);
      setI(0);
      setAnswers({});
      setResult(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load assessment");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadCourses();
  }, []);
  useEffect(() => {
    if (courseId) loadQuiz(courseId);
  }, [courseId]);
  if (loading) return <Page>Loading assessment…</Page>;
  if (err)
    return (
      <Page>
        <div className="max-w-2xl mx-auto bg-red-50 text-red-700 rounded-2xl p-5">
          {err}
        </div>
      </Page>
    );
  if (!courses.length)
    return (
      <Page>
        <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-8 text-center">
          <div className="text-4xl">📝</div>
          <h1 className="text-xl font-bold mt-3">Enroll in a course first</h1>
          <p className="text-slate-500 mt-2">
            Assessments are linked to the courses you are enrolled in.
          </p>
        </div>
      </Page>
    );
  if (!quiz?.questions?.length)
    return (
      <Page>
        <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-8 text-center">
          <div className="text-4xl">📝</div>
          <h1 className="text-xl font-bold mt-3">
            No assessment questions yet
          </h1>
          <p className="text-slate-500 mt-2">
            Your instructor has not added questions to this course assessment.
          </p>
          <button
            onClick={() => loadQuiz(courseId)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Refresh
          </button>
        </div>
      </Page>
    );
  const q = quiz.questions[i];
  async function submit() {
    try {
      const r = await api<any>(`/quizzes/${quiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: quiz.questions.map((x: any) => ({
            questionId: x.id,
            answer: answers[x.id] ?? null,
          })),
        }),
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    }
  }
  return (
    <Page>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-s font-bold uppercase tracking-wider ">
              Assessment
            </p>
            <h1 className="text-3xl text-red-400 font-bold mt-1">{quiz.title}</h1>
            <p className="text-white mt-1">
              A fresh randomized set of up to 5 questions is loaded for every
              attempt.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="border rounded-xl px-3 py-2.5 bg-white text-sm font-semibold"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadQuiz(courseId)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold"
            >
              New Questions
            </button>
          </div>
        </div>
        <p className="text-rose-500 mt-5">
          Question {i + 1} of {quiz.questions.length}
        </p>
        <div className="flex gap-1 my-5">
          {quiz.questions.map((x: any, j: number) => (
            <div
              key={x.id}
              className={`h-2 flex-1 rounded ${j === i ? "bg-indigo-600" : answers[x.id] !== undefined ? "bg-emerald-500" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <div className="bg-white border rounded-2xl p-4 sm:p-6">
          <h2 className="text-xl font-bold mb-5">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((o: string, j: number) => (
              <button
                key={o}
                onClick={() => setAnswers({ ...answers, [q.id]: j })}
                className={`w-full text-left p-4 rounded-xl border transition ${answers[q.id] === j ? "border-indigo-600 bg-indigo-50" : ""}`}
              >
                <b>{String.fromCharCode(65 + j)}.</b> {o}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button
            disabled={!i}
            onClick={() => setI(i - 1)}
            className="px-4 py-2 rounded-xl bg-slate-100"
          >
            ← Previous
          </button>
          {i < quiz.questions.length - 1 ? (
            <button
              onClick={() => setI(i + 1)}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={submit}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
            >
              Submit Quiz
            </button>
          )}
        </div>
        {result && (
          <div className="mt-5 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <b>Assessment complete</b>
            <div className="text-4xl font-bold">{result.attempt.score}/100</div>
            <p className="text-sm text-slate-600 mt-1">
              {result.correct} of {result.total} correct.
            </p>
            <button
              onClick={() => loadQuiz(courseId)}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Retake with new questions
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}

function Assignments() {
  const [assignments, setAssignments] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<any>(null),
    [answer, setAnswer] = useState(""),
    [msg, setMsg] = useState(""),
    [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const d = await api<any>("/dashboard");
      setAssignments(d.assignments || []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load assignments",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(a: any) {
    if (!answer.trim()) {
      setMsg("Please enter your submission before sending it.");
      return;
    }

    try {
      const r = await api<any>(`/assignments/${a.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answer: answer.trim(),
        }),
      });

      setAssignments((prev) =>
        prev.map((x) =>
          x.id === a.id
            ? {
                ...x,
                submissionStatus: "pending",
                submittedAt:
                  r.submission?.submittedAt ||
                  new Date().toISOString(),
              }
            : x,
        ),
      );

      setMsg("Assignment submitted ✓");
      setSelected(null);
      setAnswer("");
    } catch (e) {
      setMsg(
        e instanceof Error ? e.message : "Submission failed",
      );
    }
  }

  return (
    <Page>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lime-400">
            STUDENT WORK
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Assignments
          </h1>

          <p className="text-Fuchsia-500 mt-1">
            View your assignments, submit your work and check your grades.
          </p>
        </div>

        <button
          onClick={load}
          className="px-4 py-2.5 rounded-xl bg-slate-100 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {msg && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl">
          {msg}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">
          Loading assignments…
        </div>
      ) : assignments.length ? (
        <div className="space-y-4">
          {assignments.map((a: any, i: number) => (
            <div
              key={a.id}
              className="bg-white border rounded-2xl p-5 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-bold">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="font-bold text-lg">
                      {a.title}
                    </h2>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        a.submissionStatus === "done"
                          ? "bg-emerald-50 text-emerald-700"
                          : a.submissionStatus === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.submissionStatus === "done"
                        ? "Done"
                        : a.submissionStatus === "pending"
                          ? "Submitted"
                          : "Not submitted"}
                    </span>

                  </div>

                  <p className="text-sm text-slate-600 mt-1">
                    {a.description || "No instructions provided."}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Due:{" "}
                    {a.dueAt
                      ? new Date(a.dueAt).toLocaleString()
                      : "No due date"}
                  </p>

                  {a.submissionStatus === "done" && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">

                      <div>
                        <span className="font-semibold">
                          Score:
                        </span>{" "}
                        {a.score}/100
                      </div>

                      <div className="mt-1">
                        <span className="font-semibold">
                          Instructor remarks:
                        </span>{" "}
                        {a.remarksProvided
                          ? a.feedback
                          : "No remarks provided."}
                      </div>

                    </div>
                  )}

                  {a.submissionStatus === "pending" && (
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      ✓ Submitted. Your submission is waiting for the
                      instructor to check it.
                    </p>
                  )}
                </div>

                {a.submissionStatus === "not_submitted" && (
                  <button
                    onClick={() => {
                      setSelected(a);
                      setAnswer("");
                      setMsg("");
                    }}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold"
                  >
                    Submit
                  </button>
                )}

              </div>
            </div>
          ))}
        </div> 
      ) : (
         <div className="bg-white border border-dashed rounded 2xl p-10 text-center text-slate-500">
           <div className="text 4xl">📝</div>
          
          <h2 className="font-bold text-lg mt-3">
            No assignments yet
          </h2>
          
          <p className="text-sm mt-1">
            Your instructor has not assigned any work yet.
          </p>
      </div>
    )}

    {selected && (
      <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl p-6 w-full maxx-w-lg shadow-2xl">

          <div className="flex justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Submission
              </p>

              <h2 className="font-bold text-xl mt-1">
                {selected.title}
              </h2>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-xl bg-slate-100">
                ✕
              </button>


          </div>

          {selected.description && (
            <p className="text-sm text-slate-500 mt-4">
              {selected.description}
            </p>
          )}

          <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full border rounded-xl p-3 mt-5 min-h-40"
          placeholder="Enter your submission..."/>

          <button 
          onClick={() => submit(selected)}
          className="w-full mt-3 py-3 bg-indigio-600 text-white rounded-xl font-bold">
            Submit Assignment
          </button>


        </div>
      </div>
    )}
   </Page>
);
}

function Progress({
  setCourse,
  setScreen,
  focus = "none",
}: {
  setCourse: (id: string) => void;
  setScreen: (s: Screen) => void;
  focus?: "none" | "hours" | "certificates";
}) {
  const [data, setData] = useState<any>(),
    [assignments, setAssignments] = useState<any[]>([]),
    [certificates, setCertificates] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [answer, setAnswer] = useState(""),
    [msg, setMsg] = useState("");
  async function load() {
    const d = await api<any>("/dashboard");
    setData(d);
    setAssignments(d.assignments || []);
    const c = await api<any>("/certificates").catch(() => ({
      certificates: [],
    }));
    setCertificates(c.certificates || []);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (focus !== "none")
      setTimeout(
        () =>
          document
            .getElementById(`progress-${focus}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80,
      );
  }, [focus]);
  async function submit(a: any) {
    if (!answer.trim()) {
      setMsg("Please enter your submission before sending it.");
      return;
    }
    try {
      const r = await api<any>(`/assignments/${a.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answer: answer.trim() }),
      });
      setAssignments((prev) =>
        prev.map((x) =>
          x.id === a.id
            ? {
                ...x,
                submissionStatus: "pending",
                submittedAt:
                  r.submission?.submittedAt || new Date().toISOString(),
              }
            : x,
        ),
      );
      setMsg("Assignment submitted ✓");
      setSelected(null);
      setAnswer("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Submission failed");
    }
  }
  if (!data) return <Page>Loading progress…</Page>;
  return (
    <Page>
      <h1 className="text-2xl sm:text-3xl font-bold">My Progress</h1>
      <p className="text-lime-200 mt-1 mb-6">
        Track courses, assignments and learning activity.
      </p>
      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        <section
          id="progress-hours"
          className={`bg-white border rounded-2xl p-5 ${focus === "hours" ? "ring-2 ring-indigo-300 shadow-md" : ""}`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            LEARNING ACTIVITY
          </p>
          <h2 className="font-bold text-xl mt-1">Hours this week</h2>
          <div className="text-4xl font-bold mt-3">
            {data.stats.hoursThisWeek}h
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Your current weekly learning activity.
          </p>
          <div className="h-2 bg-slate-100 rounded-full mt-4">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{
                width: `${Math.min(100, ((Number(data.stats.hoursThisWeek) || 0) / 20) * 100)}%`,
              }}
            />
          </div>
        </section>
        <section
          id="progress-certificates"
          className={`bg-white border rounded-2xl p-5 ${focus === "certificates" ? "ring-2 ring-emerald-300 shadow-md" : ""}`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            ACHIEVEMENTS
          </p>
          <h2 className="font-bold text-xl mt-1">Certificates</h2>
          <div className="text-4xl font-bold mt-3">{certificates.length}</div>
          <p className="text-sm text-slate-500 mt-1">
            Certificates earned from completed courses.
          </p>
          {certificates.length > 0 && (
            <div className="mt-4 space-y-2">
              {certificates.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-emerald-50 text-emerald-800"
                >
                  <b className="text-sm">{c.courseTitle}</b>
                  <p className="text-xs mt-1">
                    Issued{" "}
                    {c.issuedAt
                      ? new Date(c.issuedAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {data.courses.map((c: Course, i: number) => {
          const progress = safeProgress(c.progress);
          const done = Boolean(c.completed || progress >= 100);
          return (
            <div key={c.id} className="bg-white border rounded-2xl p-4 sm:p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <b>{c.title}</b>
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {done ? "Completed" : "In progress"}
                  </span>
                </div>
                <b>{done ? 100 : progress}%</b>
              </div>
              <div className="h-2 bg-slate-100 rounded mt-4">
                <div
                  className={`h-full rounded ${done ? "bg-emerald-500" : "bg-indigo-600"}`}
                  style={{ width: `${done ? 100 : progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {c.completedLessons || 0} lessons completed
              </p>
              <button
                onClick={() => {
                  setCourse(c.id);
                  setScreen("player");
                }}
                className={`w-full mt-4 py-2.5 rounded-xl font-semibold ${done ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-600"}`}
              >
                {done ? "Rewatch course →" : "Continue course →"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="bg-white border rounded-2xl mt-6 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold">Assignments</h2>
            <p className="text-sm text-slate-500">
              Submit work and see when your instructor has checked it.
            </p>
          </div>
        </div>
        {msg && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl mb-3">
            {msg}
          </div>
        )}
        {assignments.length ? (
          assignments.map((a) => (
            <div key={a.id} className="py-4 border-b last:border-0">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <b>{a.title}</b>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${a.submissionStatus === "done" ? "bg-emerald-50 text-emerald-700" : a.submissionStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {a.submissionStatus === "done"
                        ? "Done"
                        : a.submissionStatus === "pending"
                          ? "Submitted"
                          : "Not submitted"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Due {a.dueAt ? new Date(a.dueAt).toLocaleString() : "—"}
                  </p>
                  {a.submissionStatus === "done" && (
                    <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                      <div>
                        <span className="font-semibold">Score:</span> {a.score}
                        /100
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">
                          Instructor remarks:
                        </span>{" "}
                        {a.remarksProvided
                          ? a.feedback
                          : "No remarks provided."}
                      </div>
                    </div>
                  )}
                  {a.submissionStatus === "pending" && (
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      ✓ Submitted. Your submission is waiting for the instructor
                      to check it.
                    </p>
                  )}
                </div>
                {a.submissionStatus === "not_submitted" && (
                  <button
                    onClick={() => setSelected(a)}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No assignments.</p>
        )}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between">
              <h2 className="font-bold text-xl">{selected.title}</h2>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full border rounded-xl p-3 mt-5 min-h-40"
              placeholder="Enter your submission…"
            />
            <button
              onClick={() => submit(selected)}
              className="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl font-bold"
            >
              Submit Assignment
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}

function QuizManager({
  courseId,
  onMessage,
}: {
  courseId: string;
  onMessage: (s: string) => void;
}) {
  const [quiz, setQuiz] = useState<any>(null),
    [question, setQuestion] = useState(""),
    [options, setOptions] = useState(["", "", "", ""]),
    [answer, setAnswer] = useState(0),
    [editing, setEditing] = useState<any>(null),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await api<any>(`/instructor/courses/${courseId}/quiz`);
      setQuiz(r.quiz);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not load questions");
    }
  }
  useEffect(() => {
    load();
  }, [courseId]);
  function reset() {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setAnswer(0);
    setEditing(null);
  }
  async function save() {
    const clean = options.map((x) => x.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2)
      return onMessage("Enter a question and at least 2 options");
    if (answer >= clean.length)
      return onMessage("Choose a valid correct option");
    setBusy(true);
    try {
      if (editing) {
        const r = await api<any>(
          `/instructor/quizzes/questions/${editing.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              question: question.trim(),
              options: clean,
              answer,
            }),
          },
        );
        setQuiz((q: any) => ({
          ...q,
          questions: q.questions.map((x: any) =>
            x.id === editing.id ? r.question : x,
          ),
        }));
        onMessage("Question updated ✓");
      } else {
        const r = await api<any>(
          `/instructor/courses/${courseId}/quiz/questions`,
          {
            method: "POST",
            body: JSON.stringify({
              question: question.trim(),
              options: clean,
              answer,
            }),
          },
        );
        setQuiz((q: any) => ({
          ...q,
          questions: [...(q?.questions || []), r.question],
        }));
        onMessage("Question added ✓");
      }
      reset();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not save question");
    } finally {
      setBusy(false);
    }
  }
  async function remove(q: any) {
    if (!window.confirm(`Delete this question?`)) return;
    try {
      await api(`/instructor/quizzes/questions/${q.id}`, { method: "DELETE" });
      setQuiz((x: any) => ({
        ...x,
        questions: x.questions.filter((z: any) => z.id !== q.id),
      }));
      onMessage("Question deleted ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not delete question");
    }
  }
  function edit(q: any) {
    setEditing(q);
    setQuestion(q.question);
    setOptions([...q.options, "", ""].slice(0, 4));
    setAnswer(q.answer);
  }
  return (
    <div className="bg-slate-50 border rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <b>Assessment question bank</b>
          <p className="text-xs text-slate-500 mt-1">
            Students receive a randomized set of up to 5 questions each attempt.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
          {quiz?.questions?.length || 0} questions
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {quiz?.questions?.map((q: any, i: number) => (
          <div key={q.id} className="bg-white border rounded-xl p-4">
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1">
                <b className="text-sm">{q.question}</b>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {q.options.map((o: string, j: number) => (
                    <span
                      key={o}
                      className={`text-xs p-2 rounded-lg ${j === q.answer ? "bg-emerald-50 text-emerald-700 font-semibold" : "bg-slate-50 text-slate-600"}`}
                    >
                      {String.fromCharCode(65 + j)}. {o}
                      {j === q.answer ? " ✓" : ""}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => edit(q)}
                  className="text-xs px-2.5 py-1.5 bg-slate-100 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(q)}
                  className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 bg-white border rounded-xl p-4">
        <h3 className="font-semibold">
          {editing ? "Edit question" : "Add question"}
        </h3>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question"
          className="w-full border rounded-xl px-3 py-2.5 mt-3"
        />
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={answer === i}
                onChange={() => setAnswer(i)}
              />
              <input
                value={o}
                onChange={(e) =>
                  setOptions(
                    options.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 border rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            disabled={busy}
            onClick={save}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold"
          >
            {busy ? "Saving…" : editing ? "Update Question" : "Add Question"}
          </button>
          {editing && (
            <button
              onClick={reset}
              className="px-4 py-2.5 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InstructorStudents({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null),
    [err, setErr] = useState("");
  useEffect(() => {
    api<any>("/instructor/students")
      .then(setData)
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Could not load students"),
      );
  }, []);
  return (
    <Page>
      <button
        onClick={onBack}
        className="mb-5 text-sm font-semibold text-amber-600"
      >
        ← Back to Instructor Dashboard
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          STUDENT OVERVIEW
        </p>
        <h1 className="text-3xl font-bold mt-1">Enrolled Students</h1>
        <p className="text-slate-500 mt-1">
          See every student enrolled in your courses and how far they have
          progressed.
        </p>
      </div>
      {err ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4">{err}</div>
      ) : !data ? (
        <div className="text-slate-500">Loading students…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Students</p>
              <b className="text-3xl">{data.students.length}</b>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Enrollments</p>
              <b className="text-3xl">{data.rows.length}</b>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Course records</p>
              <b className="text-3xl">
                {new Set(data.rows.map((r: any) => r.courseId)).size}
              </b>
            </div>
          </div>
          <div className="space-y-5">
            {data.students.length ? (
              data.students.map((student: any) => (
                <div
                  key={student.id}
                  className="bg-white border rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="p-5 flex items-center gap-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 grid place-items-center font-bold text-lg">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{student.name}</h2>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-full">
                      {student.courses.length} course
                      {student.courses.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.courses.map((r: any) => (
                      <div
                        key={r.id}
                        className="rounded-2xl bg-slate-50 border border-slate-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <b className="text-sm">{r.courseTitle}</b>
                            <p className="text-xs text-slate-500 mt-1">
                              {r.completedLessons}/{r.totalLessons || 0} lessons
                              completed
                            </p>
                          </div>
                          <b className="text-indigo-600">{r.progress}%</b>
                        </div>
                        <div className="h-2 bg-white rounded-full mt-4 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, r.progress))}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                          {r.progress >= 100
                            ? "Course completed"
                            : r.progress > 0
                              ? "In progress"
                              : "Not started"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-slate-500">
                No students are enrolled in your courses yet.
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  );
}

function InstructorAnalytics({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null),
    [err, setErr] = useState("");
  useEffect(() => {
    api<any>("/instructor/analytics")
      .then(setData)
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Could not load analytics"),
      );
  }, []);
  return (
    <Page>
      <button
        onClick={onBack}
        className="mb-5 text-sm font-semibold text-amber-600"
      >
        ← Back to Instructor Dashboard
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-olive-700">
          LEARNING ANALYTICS
        </p>
        <h1 className="text-3xl font-bold mt-1">Course Progress Analytics</h1>
        <p className="text-slate-700 mt-1">
          Understand enrollment and completion across the courses you teach.
        </p>
      </div>
      {err ? (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4">{err}</div>
      ) : !data ? (
        <div className="text-slate-500">Loading analytics…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Total students</p>
              <b className="text-3xl">{data.totalStudents}</b>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Enrollments</p>
              <b className="text-3xl">{data.totalEnrollments}</b>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Average completion</p>
              <b className="text-3xl">{data.averageCompletion}%</b>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-5">
              <p className="text-sm text-slate-500">Completed learners</p>
              <b className="text-3xl">{data.distribution.completed}</b>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr] gap-5">
            <div className="bg-white border rounded-2xl p-4 sm:p-6">
              <h2 className="font-bold text-lg">Learner distribution</h2>
              <div className="space-y-5 mt-6">
                {[
                  ["Completed", data.distribution.completed, "bg-emerald-500"],
                  [
                    "In progress",
                    data.distribution.inProgress,
                    "bg-indigo-600",
                  ],
                  ["Not started", data.distribution.notStarted, "bg-slate-300"],
                ].map(([label, value, color]: any) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{label}</span>
                      <b>{value}</b>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{
                          width: `${data.totalEnrollments ? Math.round((value / data.totalEnrollments) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-4 sm:p-6">
              <h2 className="font-bold text-lg">Course performance</h2>
              <div className="mt-4 space-y-3">
                {data.courses.map((c: any) => (
                  <div key={c.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <b className="text-sm">{c.title}</b>
                        <p className="text-xs text-slate-500 mt-1">
                          {c.students} students · {c.lessons} lessons ·{" "}
                          {c.assignments} assignments
                        </p>
                      </div>
                      <b className="text-indigo-600">{c.completion}%</b>
                    </div>
                    <div className="h-2 bg-white rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${c.completion}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!data.courses.length && (
                  <p className="text-slate-500 text-sm">No courses yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function InstructorReviews({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null),
    [score, setScore] = useState<Record<string, string>>({}),
    [feedback, setFeedback] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState<string | null>(null),
    [msg, setMsg] = useState("");
  const load = () =>
    api<any>("/instructor/overview")
      .then(setData)
      .catch((e) =>
        setMsg(e instanceof Error ? e.message : "Could not load reviews"),
      );
  useEffect(() => {
    load();
  }, []);
  async function grade(s: any) {
    const raw = score[s.id]?.trim();
    if (raw === "") return setMsg("Please enter a score before grading.");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100)
      return setMsg("Score must be between 0 and 100.");
    setBusy(s.id);
    try {
      const r = await api<any>(`/instructor/submissions/${s.id}/grade`, {
        method: "POST",
        body: JSON.stringify({
          score: n,
          feedback: feedback[s.id]?.trim() || "",
        }),
      });
      setMsg(
        r.submission?.remarksProvided
          ? "Submission graded and remarks sent ✓"
          : "Submission graded — no remarks provided ✓",
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not grade submission");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Page>
      <button
        onClick={onBack}
        className="mb-5 text-sm font-semibold text-amber-600"
      >
        ← Back to Instructor Dashboard
      </button>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
          REVIEWS
        </p>
        <h1 className="text-3xl text-mist-300 font-bold mt-1">
          Student Reviews & Discussions
        </h1>
        <p className="text-rose-500/60 mt-1">
          Grade submissions and keep up with comments from your students.
        </p>
      </div>
      {msg && (
        <div className="mb-5 p-4 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
          {msg}
        </div>
      )}
      {!data ? (
        <div className="text-slate-500">Loading reviews…</div>
      ) : (
        <div className="space-y-5">
          <section className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-5 border-b">
              <div className="flex justify-between">
                <div>
                  <h2 className="font-bold text-lg">Grading Queue</h2>
                  <p className="text-sm text-slate-500">
                    {data.gradingQueue.length} submission
                    {data.gradingQueue.length === 1 ? "" : "s"} waiting for
                    review.
                  </p>
                </div>
                <span className="px-3 py-4 rounded-full bg-mauve-800 text-amber-500 text-xs font-bold">
                  {data.gradingQueue.length} pending
                </span>
              </div>
            </div>
            {data.gradingQueue.length ? (
              data.gradingQueue.map((s: any) => (
                <div key={s.id} className="p-5 border-b last:border-0">
                  <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
                    <div className="flex-1">
                      <b>{s.studentName}</b>
                      <p className="text-sm text-slate-500 mt-1">
                        {s.courseTitle} · {s.assignmentTitle}
                      </p>
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm">
                        {s.answer || "No written answer provided."}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={score[s.id] || ""}
                        onChange={(e) =>
                          setScore({ ...score, [s.id]: e.target.value })
                        }
                        placeholder="Score"
                        className="w-full sm:w-24 border rounded-xl px-3 py-2.5"
                      />
                      <input
                        value={feedback[s.id] || ""}
                        onChange={(e) =>
                          setFeedback({ ...feedback, [s.id]: e.target.value })
                        }
                        placeholder="Remarks (optional)"
                        className="w-full sm:w-60 border rounded-xl px-3 py-2.5"
                      />
                      <button
                        disabled={busy === s.id}
                        onClick={() => grade(s)}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60"
                      >
                        {busy === s.id ? "Grading…" : "Grade"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                ✨ No pending submissions.
              </div>
            )}
          </section>
          <section className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-lg">Student Video Discussions</h2>
              <p className="text-sm text-slate-500 mt-1">
                Comments posted against your lessons.
              </p>
            </div>
            {data.comments?.length ? (
              data.comments.map((c: any) => (
                <div key={c.id} className="p-5 border-b last:border-0">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center font-bold">
                      {String(c.studentName || "S")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <b>{c.studentName}</b>
                      <p className="text-xs text-indigo-600 mt-1">
                        {c.courseTitle} · {c.lessonTitle}
                      </p>
                      <p className="text-sm text-slate-700 mt-2">{c.body}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                💬 No student comments yet.
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}

function Instructor({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [view, setView] = useState<
    "overview" | "students" | "reviews" | "analytics" | "courses"
  >("overview");
  const [courseFilter, setCourseFilter] = useState<
    "all" | "published" | "drafts"
  >("all");
  const [data, setData] = useState<any>();
  const [course, setCourse] = useState<any>(null);
  const [modal, setModal] = useState<
    "create" | "edit" | "lesson" | "assignment" | "quiz" | "choose" | null
  >(null);
  const [managerKind, setManagerKind] = useState<
    "lesson" | "assignment" | "quiz"
  >("lesson");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Development");
  const [level, setLevel] = useState("Beginner");
  const [duration, setDuration] = useState("10");
  const [message, setMessage] = useState("");
  const load = () =>
    api<any>("/instructor/overview")
      .then(setData)
      .catch((e) =>
        setMessage(
          e instanceof Error
            ? e.message
            : "Could not load instructor dashboard",
        ),
      );
  useEffect(() => {
    load();
  }, []);

  function reset() {
    setModal(null);
    setCourse(null);
    setManagerKind("lesson");
    setTitle("");
    setDescription("");
    setCategory("Development");
    setLevel("Beginner");
    setDuration("10");
  }
  async function create() {
    if (!title.trim()) return setMessage("Course title is required");
    const hours = Number(duration);
    if (!Number.isFinite(hours) || hours <= 0)
      return setMessage("Duration must be greater than 0 hours");
    try {
      const r = await api<any>("/instructor/courses", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          level: level.trim(),
          durationHours: hours,
        }),
      });
      setData((d: any) => ({ ...d, courses: [...d.courses, r.course] }));
      setMessage("Course created ✓");
      reset();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create course");
    }
  }
  async function edit() {
    if (!course || !title.trim()) return setMessage("Course title is required");
    const hours = Number(duration);
    if (!Number.isFinite(hours) || hours <= 0)
      return setMessage("Duration must be greater than 0 hours");
    try {
      const r = await api<any>(`/instructor/courses/${course.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          level: level.trim(),
          durationHours: hours,
        }),
      });
      setData((d: any) => ({
        ...d,
        courses: d.courses.map((x: any) => (x.id === course.id ? r.course : x)),
      }));
      setMessage("Course updated ✓");
      reset();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update course");
    }
  }
  async function delCourse(c: any) {
    if (
      !window.confirm(
        `Delete "${c.title}" and all its lessons, assignments and assessment data? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/instructor/courses/${c.id}`, { method: "DELETE" });
      setData((d: any) => ({
        ...d,
        courses: d.courses.filter((x: any) => x.id !== c.id),
      }));
      setMessage("Course deleted ✓");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete course");
    }
  }
  const openManager = (kind: "lesson" | "assignment" | "quiz") => {
    if (!data.courses.length) {
      setMessage("Create a course first.");
      return;
    }
    setManagerKind(kind);
    setModal("choose");
  };
  const openCourseManager = (
    c: any,
    kind: "lesson" | "assignment" | "quiz",
  ) => {
    setCourse(c);
    setModal(kind);
  };

  if (!data)
    return (
      <Page>
        <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
          Loading instructor dashboard…
        </div>
      </Page>
    );

  const managerModal = (
    <>
      {modal === "choose" && (
        <Modal
          title={`Choose a course · ${managerKind === "lesson" ? "Video lessons" : managerKind === "assignment" ? "Assignments" : "MCQ question bank"}`}
          close={reset}
        >
          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-4">
              Choose which course you want to manage.
            </p>
            {data.courses.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCourse(c);
                  setModal(managerKind);
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <b>{c.title}</b>
                <p className="text-xs text-slate-500 mt-1">
                  {c.category} · {c.level}
                </p>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "lesson" && course && (
        <Modal title={`Manage Lessons · ${course.title}`} close={reset}>
          <LessonManager
            courseId={course.id}
            onMessage={setMessage}
            onClose={reset}
          />
        </Modal>
      )}
      {modal === "assignment" && course && (
        <Modal title={`Manage Assignments · ${course.title}`} close={reset}>
          <AssignmentManager courseId={course.id} onMessage={setMessage} />
        </Modal>
      )}
      {modal === "quiz" && course && (
        <Modal title={`MCQ Question Bank · ${course.title}`} close={reset}>
          <QuizManager courseId={course.id} onMessage={setMessage} />
        </Modal>
      )}
      {modal === "create" && (
        <Modal title="Create Course" close={reset}>
          <div className="space-y-3">
            <Field label="Title" value={title} onChange={setTitle} />
            <Field
              label="Description"
              value={description}
              onChange={setDescription}
            />
            <Field label="Category" value={category} onChange={setCategory} />
            <Field label="Level" value={level} onChange={setLevel} />
            <Field
              label="Duration (hours)"
              value={duration}
              onChange={setDuration}
              type="number"
            />
            <button
              onClick={create}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
            >
              Create
            </button>
          </div>
        </Modal>
      )}
      {modal === "edit" && (
        <Modal title="Edit Course" close={reset}>
          <div className="space-y-3">
            <Field label="Title" value={title} onChange={setTitle} />
            <Field
              label="Description"
              value={description}
              onChange={setDescription}
            />
            <Field label="Category" value={category} onChange={setCategory} />
            <Field label="Level" value={level} onChange={setLevel} />
            <Field
              label="Duration (hours)"
              value={duration}
              onChange={setDuration}
              type="number"
            />
            <button
              onClick={edit}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
            >
              Save Changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );

  if (view === "students")
    return <InstructorStudents onBack={() => setView("overview")} />;
  if (view === "reviews")
    return <InstructorReviews onBack={() => setView("overview")} />;
  if (view === "analytics")
    return <InstructorAnalytics onBack={() => setView("overview")} />;

  if (view === "courses") {
    const visibleCourses = data.courses.filter((c: any) =>
      courseFilter === "published"
        ? c.published
        : courseFilter === "drafts"
          ? !c.published
          : true,
    );
    return (
      <Page>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
            <p className="text-sm text-slate-500 mt-1">
              {courseFilter === "published"
                ? "Published courses currently visible to students."
                : courseFilter === "drafts"
                  ? "Draft courses still in your workspace."
                  : "Manage the courses you teach, their lessons, assignments and assessments."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "published", "drafts"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setCourseFilter(f)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold ${courseFilter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {f === "all"
                  ? "All"
                  : f === "published"
                    ? "Published"
                    : "Drafts"}
              </button>
            ))}
            <button
              onClick={() => setView("overview")}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
        {visibleCourses.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleCourses.map((c: any, i: number) => {
              const completion = Math.min(
                100,
                Math.max(0, Number(c.completion ?? c.progress ?? 0) || 0),
              );
              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  <img
                    src={c.image || imgs[i % imgs.length]}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-lg">{c.title}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {c.students ?? 0} students · {completion}% completion
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {c.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => openCourseManager(c, "lesson")}
                        className="py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                      >
                        Manage Lessons
                      </button>
                      <button
                        onClick={() => openCourseManager(c, "assignment")}
                        className="py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold"
                      >
                        Assignments
                      </button>
                      <button
                        onClick={() => openCourseManager(c, "quiz")}
                        className="py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold col-span-2"
                      >
                        ❓ Manage MCQs
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-slate-500">
            No{" "}
            {courseFilter === "published"
              ? "published"
              : courseFilter === "drafts"
                ? "draft"
                : ""}{" "}
            courses found.
          </div>
        )}
        {managerModal}
      </Page>
    );
  }

  const courseImages = data.courses.map(
    (c: any, i: number) => c.image || imgs[i % imgs.length],
  );
  const published = data.courses.filter((c: any) => c.published).length;
  const draft = data.courses.length - published;
  const cardNav = (label: string) =>
    label === "Students"
      ? setView("students")
      : label === "Courses"
        ? setView("courses")
        : label === "Pending Reviews"
          ? setView("reviews")
          : setView("analytics");
  return (
    <Page>
      <section className="relative overflow-hidden rounded-[70px] bg-mist-600 text-white p-9 md:p-9 mb-9 shadow-xl">
        <div className="absolute -left-45 -top-14 h-902 w-72 rounded-full bg-purple-500/40 blur-3xl" />
        <div className="absolute -right-45 -top-10 h-802 w-72 rounded-full bg-purple-500/40 blur-3xl" />
        <div className="absolute right-145 bottom-[-90px] h-1000 w-90 rounded-full bg-cyan-700/50 blur-3xl" />
        <div className="absolute left-145 bottom-[-90px] h-1000 w-90 rounded-full bg-cyan-700/50 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />{" "}
              Instructor workspace
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Create. Teach. Track. 🚀
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Manage your courses, publish lessons, upload videos and keep up
              with your students from one place.
            </p>
          </div>
          <button
            onClick={() => setModal("create")}
            className="shrink-0 px-5 py-3 rounded-xl bg-white text-indigo-700 font-bold shadow-lg hover:-translate-y-0.5"
          >
            + Create New Course
          </button>
        </div>
        <div className="relative mt-7 grid sm:grid-cols-3 gap-3 max-w-3xl">
          <button
            type="button"
            onClick={() => {
              setCourseFilter("published");
              setView("courses");
            }}
            className="text-left rounded-2xl bg-white/10 border border-white/10 p-4 hover:bg-white/15 hover:-translate-y-0.5 transition"
          >
            <p className="text-xs text-slate-300">Published</p>
            <b className="text-2xl">{published}</b>
            <span className="ml-2 text-xs text-emerald-300">
              live courses →
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCourseFilter("drafts");
              setView("courses");
            }}
            className="text-left rounded-2xl bg-white/10 border border-white/10 p-4 hover:bg-white/15 hover:-translate-y-0.5 transition"
          >
            <p className="text-xs text-slate-300">Drafts</p>
            <b className="text-2xl">{draft}</b>
            <span className="ml-2 text-xs text-amber-300">in workspace →</span>
          </button>
          <button
            type="button"
            onClick={() => setView("reviews")}
            className="text-left rounded-2xl bg-white/10 border border-white/10 p-4 hover:bg-white/15 hover:-translate-y-0.5 transition"
          >
            <p className="text-xs text-slate-300">Reviews waiting</p>
            <b className="text-2xl">{data.stats.submissionsPending}</b>
            <span className="ml-2 text-xs text-indigo-200">to grade →</span>
          </button>
        </div>
      </section>
      {message && (
        <div className="mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
          <span className="font-medium">{message}</span>
          <button
            onClick={() => setMessage("")}
            className="text-emerald-700/70"
          >
            ×
          </button>
        </div>
      )}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          [
            "👥",
            data.stats.students,
            "Students",
            "Across your courses",
            "bg-indigo-50",
          ],
          [
            "📚",
            data.stats.courses,
            "Courses",
            "Total created",
            "bg-violet-50",
          ],
          [
            "📝",
            data.stats.submissionsPending,
            "Pending Reviews",
            "Need your attention",
            "bg-amber-50",
          ],
          [
            "📈",
            safeProgress(data.stats.completionRate),
            "Completion Rate",
            "Average progress",
            "bg-emerald-100",
          ],
        ].map((x) => (
          <div
            key={x[2] as string}
            role="button"
            tabIndex={0}
            onClick={() => cardNav(x[2] as string)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cardNav(x[2] as string);
              }
            }}
            className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <div
              className={`w-11 h-11 rounded-xl ${x[4]} grid place-items-center text-xl mb-4`}
            >
              {x[0]}
            </div>
            <b className="block text-2xl tracking-tight">
              {x[1]}
              {x[2] === "Completion Rate" ? "%" : ""}
            </b>
            <p className="font-semibold mt-0.5">{x[2]}</p>
            <p className="text-xs text-slate-500 mt-1">{x[3]}</p>
          </div>
        ))}
      </section>
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl text-purple-300 font-bold tracking-tight">Your Courses</h2>
          <p className="text-sm text-white mt-1">
            Build and manage everything students see.
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-sm hover:bg-indigo-100"
        >
          + Add course
        </button>
      </section>
      <section className="grid md:grid-cols-2 gap-5 mb-8">
        {data.courses.length ? (
          data.courses.map((c: any, i: number) => {
            const completion = safeProgress(c.completion ?? c.progress);
            return (
              <article
                key={c.id}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={courseImages[i]}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.published ? "bg-emerald-400 text-emerald-950" : "bg-white/90 text-slate-700"}`}
                    >
                      {c.published ? "● Published" : "○ Draft"}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-950/65 text-white text-xs">
                      {c.level}
                    </span>
                  </div>
                  <div className="absolute left-4 bottom-4 right-4 text-white">
                    <h3 className="font-bold text-lg leading-tight">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-200 mt-1">
                      {c.category} · {c.durationHours} hours
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Students</p>
                      <b className="text-lg">{c.students ?? 0}</b>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Progress</p>
                      <b className="text-lg">{completion}%</b>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-500">Lessons</p>
                      <b className="text-lg">{c.lessonsCount ?? 0}</b>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Student completion</span>
                    <b>{completion}%</b>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() => {
                        setCourse(c);
                        setTitle(c.title);
                        setDescription(c.description || "");
                        setCategory(c.category || "Development");
                        setLevel(c.level || "Beginner");
                        setDuration(String(c.durationHours || 10));
                        setModal("edit");
                      }}
                      className="py-2.5 rounded-xl bg-slate-100 font-semibold text-sm hover:bg-slate-200"
                    >
                      Edit Course
                    </button>
                    <button
                      onClick={() => openCourseManager(c, "lesson")}
                      className="py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700"
                    >
                      Manage Content
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openCourseManager(c, "assignment")}
                      className="py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100"
                    >
                      📝 Assignments
                    </button>
                    <button
                      onClick={() => openCourseManager(c, "quiz")}
                      className="py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                    >
                      ❓ Manage MCQs
                    </button>
                    <button
                      onClick={() => openCourseManager(c, "lesson")}
                      className="py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                    >
                      🎥 Lessons
                    </button>
                  </div>
                  <div className="flex items-center justify-end mt-2 pt-2">
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const r = await api<any>(
                              `/instructor/courses/${c.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  published: !c.published,
                                }),
                              },
                            );
                            setData((d: any) => ({
                              ...d,
                              courses: d.courses.map((x: any) =>
                                x.id === c.id ? r.course : x,
                              ),
                            }));
                            setMessage(
                              r.course.published
                                ? "Course published ✓"
                                : "Course unpublished ✓",
                            );
                          } catch (e) {
                            setMessage(
                              e instanceof Error
                                ? e.message
                                : "Could not update course",
                            );
                          }
                        }}
                        className="text-sm font-semibold text-indigo-600"
                      >
                        {c.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => delCourse(c)}
                        className="text-sm font-semibold text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-lg">No courses yet</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">
              Create your first course and start adding lessons.
            </p>
            <button
              onClick={() => setModal("create")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Create Course
            </button>
          </div>
        )}
      </section>
      <section className="mb-5 bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              ❓ Assessment Builder
            </div>
            <h2 className="text-xl font-bold mt-1">Manage MCQ Questions</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Add questions to each course's question bank. Students receive a
              fresh randomized set of up to 5 questions on every assessment
              attempt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.courses.map((c: any) => (
              <button
                key={c.id}
                onClick={() => openCourseManager(c, "quiz")}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm"
              >
                Manage{" "}
                {c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="mb-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg">Student Video Discussions</h2>
            <p className="text-xs text-slate-500 mt-1">
              See comments posted by students on your lessons.
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold">
            {data.comments?.length || 0} recent
          </span>
        </div>
        {data.comments?.length ? (
          <div className="divide-y divide-slate-100">
            {data.comments.map((c: any) => (
              <div key={c.id} className="p-5 flex gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold">
                  {String(c.studentName || "S")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{c.studentName}</b>
                    <span className="text-xs text-slate-400">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">
                    {c.courseTitle} · {c.lessonTitle}
                  </p>
                  <p className="text-sm text-slate-700 mt-2">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="font-semibold">No student comments yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Comments from lesson discussions will appear here.
            </p>
          </div>
        )}
      </div>
      <section className="grid lg:grid-cols-[1.3fr_.7fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Grading Queue</h2>
              <p className="text-xs text-slate-500 mt-1">
                Check submissions, give a score, and optionally leave remarks
                for the student.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-bold">
              {data.gradingQueue.length} pending
            </span>
          </div>
          {data.gradingQueue.length ? (
            data.gradingQueue.map((s: any) => (
              <GradingRow
                key={s.id}
                submission={s}
                onMessage={setMessage}
                onDone={load}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">✨</div>
              <p className="font-semibold">All caught up!</p>
              <p className="text-sm text-slate-500 mt-1">
                There are no pending submissions.
              </p>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6">
          <div className="w-11 h-11 rounded-xl bg-white grid place-items-center text-xl shadow-sm">
            ⚡
          </div>
          <h2 className="font-bold text-lg mt-4">Quick actions</h2>
          <p className="text-sm text-slate-600 mt-1">
            Jump straight into your most common tasks.
          </p>
          <div className="space-y-2 mt-5">
            <button
              onClick={() => setModal("create")}
              className="w-full text-left bg-white rounded-xl p-3.5 font-semibold text-sm shadow-sm hover:shadow-md"
            >
              ➕ Create a course{" "}
              <span className="float-right text-indigo-600">→</span>
            </button>
            <button
              type="button"
              onClick={() => openManager("lesson")}
              className="w-full text-left bg-white rounded-xl p-3.5 font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              🎥 Manage video lessons{" "}
              <span className="float-right text-indigo-600">→</span>
            </button>
            <button
              type="button"
              onClick={() => openManager("assignment")}
              className="w-full text-left bg-white rounded-xl p-3.5 font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              📝 Manage assignments{" "}
              <span className="float-right text-indigo-600">→</span>
            </button>
            <button
              type="button"
              onClick={() => openManager("quiz")}
              className="w-full text-left bg-white rounded-xl p-3.5 font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
            >
              ❓ Manage MCQ question bank{" "}
              <span className="float-right text-indigo-600">→</span>
            </button>
          </div>
        </div>
      </section>
      {managerModal}
    </Page>
  );
}

function GradingRow({
  submission,
  onMessage,
  onDone,
}: {
  submission: any;
  onMessage: (s: string) => void;
  onDone: () => Promise<any> | void;
}) {
  const [score, setScore] = useState(""),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false);
  async function grade() {
    if (score.trim() === "")
      return onMessage("Please enter a score before grading.");
    const numeric = Number(score);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100)
      return onMessage("Score must be between 0 and 100.");
    setBusy(true);
    try {
      const result = await api<any>(
        `/instructor/submissions/${submission.id}/grade`,
        {
          method: "POST",
          body: JSON.stringify({ score: numeric, feedback: feedback.trim() }),
        },
      );
      onMessage(
        result?.submission?.remarksProvided
          ? "Submission graded and remarks sent ✓"
          : "Submission graded — no remarks provided ✓",
      );
      await onDone();
    } catch (e) {
      onMessage(
        e instanceof Error
          ? e.message
          : "Could not grade submission. Check that the backend is running.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-5 border-b last:border-0 flex flex-col xl:flex-row gap-4 xl:items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center font-bold">
            {String(submission.studentName || submission.userId)
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <b className="text-sm">
              {submission.studentName || submission.userId}
            </b>
            <p className="text-xs text-slate-500">
              {submission.assignmentTitle}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-3 line-clamp-2">
          {submission.answer}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          min="0"
          max="100"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-full sm:w-24 border rounded-xl px-3 py-2.5"
          placeholder="Score"
        />
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full sm:w-52 border rounded-xl px-3 py-2.5"
          placeholder="Remarks (optional)"
        />
        <button
          type="button"
          disabled={busy}
          onClick={grade}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Grading…" : "Grade"}
        </button>
      </div>
    </div>
  );
}

function LessonManager({
  courseId,
  onMessage,
  onClose,
}: {
  courseId: string;
  onMessage: (s: string) => void;
  onClose: () => void;
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Lesson | null>(null),
    [title, setTitle] = useState(""),
    [duration, setDuration] = useState("10:00"),
    [description, setDescription] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [resourceName, setResourceName] = useState(""),
    [resourceUrl, setResourceUrl] = useState("");
  const load = () =>
    api<any>(`/instructor/courses/${courseId}`)
      .then((r) => setLessons(r.lessons || []))
      .catch((e) =>
        onMessage(e instanceof Error ? e.message : "Could not load lessons"),
      );
  useEffect(() => {
    load();
  }, [courseId]);
  function startEdit(l: Lesson) {
    setEditing(l);
    setTitle(l.title);
    setDuration(l.duration || "10:00");
    setDescription(l.description || "");
    setFile(null);
  }
  function resetEdit() {
    setEditing(null);
    setTitle("");
    setDuration("10:00");
    setDescription("");
    setFile(null);
  }
  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return onMessage("Lesson title is required");
    setBusy(true);
    try {
      const r = await api<any>(`/instructor/lessons/${editing?.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim(), duration, description }),
      });
      setLessons((ls) => ls.map((x) => (x.id === r.lesson.id ? r.lesson : x)));
      onMessage("Lesson updated ✓");
      resetEdit();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not update lesson");
    } finally {
      setBusy(false);
    }
  }
  async function replace(l: Lesson) {
    if (!file) return onMessage("Choose a video first");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("video", file);
      const r = await fetch(`/api/instructor/lessons/${l.id}/video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("skillbridge_token")}`,
        },
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Video upload failed");
      setLessons((ls) => ls.map((x) => (x.id === l.id ? j.lesson : x)));
      onMessage("Video replaced ✓");
      setFile(null);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function remove(l: Lesson) {
    if (!window.confirm(`Delete “${l.title}”? This cannot be undone.`)) return;
    try {
      await api(`/instructor/lessons/${l.id}`, { method: "DELETE" });
      setLessons((ls) => ls.filter((x) => x.id !== l.id));
      onMessage("Lesson deleted ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not delete lesson");
    }
  }
  async function move(l: Lesson, dir: number) {
    const i = lessons.findIndex((x) => x.id === l.id),
      j = i + dir;
    if (j < 0 || j >= lessons.length) return;
    const other = lessons[j];
    try {
      await api(`/instructor/lessons/${l.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: other.order }),
      });
      await api(`/instructor/lessons/${other.id}`, {
        method: "PATCH",
        body: JSON.stringify({ order: l.order }),
      });
      await load();
      onMessage("Lesson order updated ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not reorder lessons");
    }
  }
  async function addResource(l: Lesson) {
    if (!resourceName.trim() || !resourceUrl.trim())
      return onMessage("Resource name and URL are required");
    try {
      const r = await api<any>(`/instructor/lessons/${l.id}/resources`, {
        method: "POST",
        body: JSON.stringify({
          name: resourceName,
          url: resourceUrl,
          type: "link",
        }),
      });
      setLessons((ls) =>
        ls.map((x) =>
          x.id === l.id
            ? { ...x, resources: [...(x.resources || []), r.resource] }
            : x,
        ),
      );
      setResourceName("");
      setResourceUrl("");
      onMessage("Resource added ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not add resource");
    }
  }
  async function removeResource(l: Lesson, r: any) {
    if (!window.confirm(`Remove resource “${r.name}”?`)) return;
    try {
      await api(`/instructor/lessons/${l.id}/resources/${r.id}`, {
        method: "DELETE",
      });
      setLessons((ls) =>
        ls.map((x) =>
          x.id === l.id
            ? {
                ...x,
                resources: (x.resources || []).filter(
                  (z: any) => z.id !== r.id,
                ),
              }
            : x,
        ),
      );
      onMessage("Resource removed ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not remove resource");
    }
  }
  return (
    <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <div>
          <b>Lesson Manager</b>
          <p className="text-xs text-slate-500">
            Edit lessons, reorder them, manage videos and resources.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Close
        </button>
      </div>
      {lessons.length ? (
        lessons.map((l, i) => (
          <div
            key={l.id}
            className="bg-white rounded-xl border p-4 mb-3 last:mb-0"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold">
                  {i + 1}. {l.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {l.duration || "10:00"} · {(l.resources || []).length}{" "}
                  resources
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={i === 0}
                  onClick={() => move(l, -1)}
                  className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  disabled={i === lessons.length - 1}
                  onClick={() => move(l, 1)}
                  className="px-2.5 py-1.5 border rounded-lg text-xs disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  onClick={() => startEdit(l)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs"
                >
                  Edit
                </button>
                <a
                  href={
                    l.videoUrl?.startsWith("/")
                      ? `${window.location.origin}${l.videoUrl}`
                      : l.videoUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs"
                >
                  View video
                </a>
                <label className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs cursor-pointer">
                  Replace video
                  <input
                    hidden
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setEditing(l);
                    }}
                  />
                </label>
                {file && editing?.id === l.id && (
                  <button
                    disabled={busy}
                    onClick={() => replace(l)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs"
                  >
                    {busy ? "Uploading…" : "Upload"}
                  </button>
                )}
                <button
                  onClick={() => remove(l)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
            {(l.resources || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(l.resources || []).map((r: any) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs"
                  >
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600"
                    >
                      {r.name}
                    </a>
                    <button
                      onClick={() => removeResource(l, r)}
                      className="text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="Resource name"
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <input
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://resource-url.com"
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <button
                onClick={() => addResource(l)}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm"
              >
                Add resource
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500 py-4">
          No lessons yet. Add one from the New Lesson button below.
        </p>
      )}
      <button
        onClick={() => {
          resetEdit();
          setTitle("");
          setEditing({
            id: "",
            courseId: courseId,
            title: "",
            order: lessons.length + 1,
            videoUrl: "",
          });
        }}
        className="mt-3 w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-sm"
      >
        + Add Lesson
      </button>
      {editing?.id === "" && (
        <div className="mt-3 bg-white border rounded-xl p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) return onMessage("Lesson title is required");
              setBusy(true);
              try {
                const fd = new FormData();
                fd.append("title", title.trim());
                fd.append("duration", duration);
                fd.append("description", description);
                if (file) fd.append("video", file);
                const r = await fetch(
                  `/api/instructor/courses/${courseId}/lessons`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("skillbridge_token")}`,
                    },
                    body: fd,
                  },
                );
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "Could not add lesson");
                setLessons((ls) => [...ls, j.lesson]);
                onMessage("Lesson added ✓");
                resetEdit();
              } catch (e) {
                onMessage(
                  e instanceof Error ? e.message : "Could not add lesson",
                );
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-3"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Field
                label="Lesson title"
                value={title}
                onChange={setTitle}
                placeholder="Introduction"
              />
              <Field
                label="Duration"
                value={duration}
                onChange={setDuration}
                placeholder="12:30"
              />
            </div>
            <label className="block">
              <span className="block text-sm font-semibold mb-1">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 min-h-20"
              />
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded-xl p-3"
            />
            <div className="flex gap-2">
              <button
                disabled={busy}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold"
              >
                {busy ? "Saving…" : "Add Lesson"}
              </button>
              <button
                type="button"
                onClick={resetEdit}
                className="px-4 py-2.5 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {editing && editing.id !== "" && (
        <Modal title="Edit Lesson" close={resetEdit}>
          <form onSubmit={saveEdit} className="space-y-3">
            <Field label="Lesson title" value={title} onChange={setTitle} />
            <Field label="Duration" value={duration} onChange={setDuration} />
            <label className="block">
              <span className="block text-sm font-semibold mb-1">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 min-h-24"
              />
            </label>
            <button
              disabled={busy}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
            >
              {busy ? "Saving…" : "Save Lesson"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AssignmentManager({
  courseId,
  onMessage,
}: {
  courseId: string;
  onMessage: (s: string) => void;
}) {
  const [items, setItems] = useState<any[]>([]),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [dueAt, setDueAt] = useState(""),
    [editing, setEditing] = useState<any>(null),
    [showForm, setShowForm] = useState(false),
    [saving, setSaving] = useState(false);
  const load = () =>
    api<any>(`/instructor/courses/${courseId}`)
      .then((r) => setItems(r.assignments || []))
      .catch((e) =>
        onMessage(
          e instanceof Error ? e.message : "Could not load assignments",
        ),
      );
  useEffect(() => {
    load();
  }, [courseId]);
  function resetForm() {
    setTitle("");
    setDescription("");
    setDueAt("");
    setEditing(null);
    setShowForm(false);
  }
  async function save() {
    if (!title.trim()) return onMessage("Assignment title is required");
    setSaving(true);
    try {
      if (editing) {
        const r = await api<any>(`/instructor/assignments/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            dueAt: dueAt || null,
          }),
        });
        setItems((x) =>
          x.map((a) => (a.id === r.assignment.id ? r.assignment : a)),
        );
        onMessage("Assignment updated ✓");
      } else {
        const r = await api<any>(
          `/instructor/courses/${courseId}/assignments`,
          {
            method: "POST",
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim(),
              dueAt: dueAt || null,
            }),
          },
        );
        setItems((x) => [...x, r.assignment]);
        onMessage("New assignment added ✓");
      }
      resetForm();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not save assignment");
    } finally {
      setSaving(false);
    }
  }
  async function remove(a: any) {
    if (
      !window.confirm(
        `Delete “${a.title}”? This will also remove student submissions for this assignment.`,
      )
    )
      return;
    try {
      await api(`/instructor/assignments/${a.id}`, { method: "DELETE" });
      setItems((x) => x.filter((z) => z.id !== a.id));
      onMessage("Assignment deleted ✓");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Could not delete assignment");
    }
  }
  function edit(a: any) {
    setEditing(a);
    setTitle(a.title);
    setDescription(a.description || "");
    setDueAt(a.dueAt ? String(a.dueAt).slice(0, 16) : "");
    setShowForm(true);
  }
  return (
    <div className="mt-4 bg-slate-50 border rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-bold">Assignments</div>
          <p className="text-xs text-slate-500 mt-1">
            Create as many assignments as you need for this course. Each
            assignment is tracked separately for every student.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
        >
          ＋ Add Assignment
        </button>
      </div>
      {showForm && (
        <div className="mt-4 bg-white border border-indigo-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <b>{editing ? "Edit assignment" : "Create a new assignment"}</b>
              <p className="text-xs text-slate-500 mt-1">
                Students will see this assignment in My Progress after it is
                created.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title *"
              className="border rounded-xl px-3 py-2.5 text-sm"
            />
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions / description"
            className="w-full border rounded-xl px-3 py-2.5 text-sm mt-3 min-h-24"
          />
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
            >
              {saving
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save Changes"
                  : "Create Assignment"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 bg-slate-100 rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {items.map((a: any, i: number) => (
          <div key={a.id} className="bg-white border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-bold text-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{a.title}</b>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                    Assignment {i + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {a.description || "No instructions provided."}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Due:{" "}
                  {a.dueAt ? new Date(a.dueAt).toLocaleString() : "No due date"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => edit(a)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="bg-white border border-dashed rounded-xl p-7 text-center">
            <div className="text-3xl">📝</div>
            <p className="font-semibold mt-2">No assignments yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Click “Add Assignment” to give students their first task.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [screen, setScreen] = useState<Screen>("dashboard"),
    [courseId, setCourseId] = useState("c1"),
    [courseFilter, setCourseFilter] = useState<"all" | "enrolled">("all"),
    [progressFocus, setProgressFocus] = useState<
      "none" | "hours" | "certificates"
    >("none");
  useEffect(() => {
    if (localStorage.getItem("skillbridge_token"))
      api<any>("/auth/me")
        .then((r) => {
          setUser(r.user);
          setScreen(r.user.role === "instructor" ? "instructor" : "dashboard");
        })
        .catch(() => clearToken());
  }, []);
  function handleLogin(u: User) {
    setUser(u);
    setScreen(u.role === "instructor" ? "instructor" : "dashboard");
  }
  function handleScreen(next: Screen) {
    if (
      user?.role === "instructor" &&
      (next === "quiz" || next === "progress" || next === "dashboard")
    ) {
      setScreen("instructor");
      return;
    }
    setScreen(next);
  }
  if (!user) return <Login onLogin={handleLogin} />;
  return (
    <>
      <Nav
        screen={screen}
        setScreen={handleScreen}
        user={user}
        onLogout={() => {
          clearToken();
          setUser(null);
          setScreen("dashboard");
        }}
      />
      {screen === "dashboard" && user.role === "student" && (
        <Dashboard
          user={user}
          setScreen={handleScreen}
          setCourse={setCourseId}
          setCourseFilter={setCourseFilter}
          setProgressFocus={setProgressFocus}
        />
      )}{" "}
      {screen === "courses" && (
        <Courses
          setCourse={setCourseId}
          setScreen={handleScreen}
          user={user}
          courseFilter={courseFilter}
        />
      )}{" "}
      {screen === "player" && (
        <CoursePlayer
          courseId={courseId}
          setScreen={handleScreen}
          user={user}
        />
      )}{" "}
      {screen === "quiz" && user.role === "student" && <Quiz />}
      {screen === "assignments" && user.role === "student" &&(
     <Assignments/>
      )}
      {screen === "progress" && user.role === "student" && (
        <Progress
          setCourse={setCourseId}
          setScreen={handleScreen}
          focus={progressFocus}
        />
      )}
      {screen === "instructor" && user.role === "instructor" && (
        <Instructor setScreen={handleScreen} />
      )}
    </>
  );
}
