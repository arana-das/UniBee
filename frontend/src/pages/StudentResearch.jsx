
import { useMemo, useState } from "react";
import {
  FlaskConical,
  Search,
  Plus,
  X,
  FolderKanban,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Users,
  BookOpen,
  ArrowUpRight,
  Target,
  FileText,
  Trash2,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

// Frontend demonstration data.
// Real projects will later come from MongoDB.

const initialProjects = [
  {
    id: 1,
    title: "IoT Network Intrusion Detection",
    category: "Cybersecurity",
    supervisor: "Dr. Ayesha Rahman",
    team: "Research Team Alpha",
    status: "In Progress",
    deadline: "2026-12-20",
    description:
      "Investigating machine learning techniques for detecting suspicious activities and potential network attacks in IoT environments.",
    tasks: [
      { id: 1, title: "Literature review", completed: true },
      { id: 2, title: "Dataset preparation", completed: true },
      { id: 3, title: "Model development", completed: false },
      { id: 4, title: "Performance evaluation", completed: false },
      { id: 5, title: "Research paper preparation", completed: false },
    ],
  },
  {
    id: 2,
    title: "Smart Campus Management System",
    category: "Software Development",
    supervisor: "Dr. Farhan Kabir",
    team: "Team Innovators",
    status: "In Progress",
    deadline: "2026-11-30",
    description:
      "Designing a web-based platform for improving university service management, communication, and student engagement.",
    tasks: [
      { id: 1, title: "Requirements analysis", completed: true },
      { id: 2, title: "UI/UX design", completed: true },
      { id: 3, title: "Frontend implementation", completed: true },
      { id: 4, title: "Backend development", completed: false },
      { id: 5, title: "System testing", completed: false },
    ],
  },
  {
    id: 3,
    title: "Machine Learning for Student Performance",
    category: "Artificial Intelligence",
    supervisor: "Dr. Nusrat Jahan",
    team: "AI Research Group",
    status: "Planning",
    deadline: "2027-01-15",
    description:
      "Exploring predictive models for identifying academic performance patterns using anonymized educational data.",
    tasks: [
      { id: 1, title: "Define research objectives", completed: true },
      { id: 2, title: "Review related studies", completed: false },
      { id: 3, title: "Prepare research methodology", completed: false },
      { id: 4, title: "Collect and process data", completed: false },
    ],
  },
  {
    id: 4,
    title: "University Event Analytics",
    category: "Data Analytics",
    supervisor: "Md. Rahim Hasan",
    team: "Data Science Club",
    status: "Completed",
    deadline: "2026-09-15",
    description:
      "Analyzing student event participation patterns and developing informative dashboards using sample event data.",
    tasks: [
      { id: 1, title: "Collect sample data", completed: true },
      { id: 2, title: "Data cleaning", completed: true },
      { id: 3, title: "Create visualizations", completed: true },
      { id: 4, title: "Prepare final report", completed: true },
    ],
  },
];

const statusStyles = {
  Planning: "bg-[#EAF0F8] text-[#456A94]",
  "In Progress": "bg-[#FFF4DC] text-[#A57921]",
  Completed: "bg-[#EAF2E8] text-[#427A67]",
};

const categories = [
  "Cybersecurity",
  "Software Development",
  "Artificial Intelligence",
  "Data Analytics",
  "Networking",
  "Other",
];

function getProgress(project) {
  if (!project.tasks.length) return 0;

  const completed = project.tasks.filter(
    (task) => task.completed
  ).length;

  return Math.round((completed / project.tasks.length) * 100);
}

function StudentResearch() {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    category: "Cybersecurity",
    supervisor: "",
    deadline: "",
    description: "",
  });

  const selectedProject = projects.find(
    (project) => project.id === selectedId
  );

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(query) ||
        project.category.toLowerCase().includes(query) ||
        project.supervisor.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        project.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        project.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [projects, search, statusFilter, categoryFilter]);

  const planningCount = projects.filter(
    (project) => project.status === "Planning"
  ).length;

  const activeCount = projects.filter(
    (project) => project.status === "In Progress"
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const toggleTask = (projectId, taskId) => {
    setProjects((previous) =>
      previous.map((project) => {
        if (project.id !== projectId) return project;

        const updatedTasks = project.tasks.map((task) =>
          task.id === taskId
            ? { ...task, completed: !task.completed }
            : task
        );

        const allCompleted =
          updatedTasks.length > 0 &&
          updatedTasks.every((task) => task.completed);

        return {
          ...project,
          tasks: updatedTasks,
          status: allCompleted
            ? "Completed"
            : updatedTasks.some((task) => task.completed)
            ? "In Progress"
            : "Planning",
        };
      })
    );
  };

  const addTask = (projectId, title) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setProjects((previous) =>
      previous.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status:
                project.status === "Completed"
                  ? "In Progress"
                  : project.status,
              tasks: [
                ...project.tasks,
                {
                  id: Date.now(),
                  title: cleanTitle,
                  completed: false,
                },
              ],
            }
          : project
      )
    );
  };

  const createProject = (event) => {
    event.preventDefault();

    if (
      !newProject.title.trim() ||
      !newProject.supervisor.trim() ||
      !newProject.deadline
    ) {
      return;
    }

    const project = {
      id: Date.now(),
      ...newProject,
      title: newProject.title.trim(),
      supervisor: newProject.supervisor.trim(),
      team: "My Research Project",
      status: "Planning",
      tasks: [],
    };

    setProjects((previous) => [project, ...previous]);

    setNewProject({
      title: "",
      category: "Cybersecurity",
      supervisor: "",
      deadline: "",
      description: "",
    });

    setShowCreateModal(false);
  };

  const summary = [
    {
      title: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
    },
    {
      title: "In Progress",
      value: activeCount,
      icon: Clock3,
    },
    {
      title: "Completed",
      value: completedCount,
      icon: CheckCircle2,
    },
    {
      title: "Planning",
      value: planningCount,
      icon: Target,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#B18B37]">
            ACADEMIC INNOVATION
          </p>

          <h1 className="text-3xl font-extrabold text-[#234E43] md:text-4xl">
            Research & Projects
          </h1>

          <p className="mt-3 text-[#718579]">
            Organize research activities, track project milestones,
            and explore your academic progress.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
        >
          <Plus size={19} />
          New Project
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E2EADC] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2E8] text-[#234E43]">
                <Icon size={24} />
              </div>

              <p className="text-sm text-[#718579]">
                {item.title}
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#234E43]">
                {item.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Research Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#234E43] p-8 text-white md:p-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#DCE9DE]">
            <FlaskConical size={16} className="text-[#D9A536]" />
            RESEARCH & INNOVATION
          </div>

          <h2 className="mt-6 text-3xl font-extrabold md:text-4xl">
            Explore ideas.
            <br />
            <span className="text-[#E8BE62]">
              Build meaningful solutions.
            </span>
          </h2>

          <p className="mt-5 leading-relaxed text-[#C9DDCF]">
            Every research journey begins with curiosity.
            Keep your ideas, milestones, and achievements organized
            with UniBee.
          </p>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="rounded-2xl border border-[#E2EADC] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA092]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search research projects..."
              className="w-full rounded-xl border border-[#E2EADC] bg-[#F9FBF8] py-3.5 pl-12 pr-4 text-sm text-[#234E43] outline-none focus:border-[#A6C1A4]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filter project category"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Categories</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter project status"
            className="rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm text-[#45685B]"
          >
            <option value="All">All Status</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <p className="mt-4 text-sm text-[#718579]">
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
      </section>

      {/* Project Cards */}
      {filteredProjects.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const progress = getProgress(project);
            const completedTasks = project.tasks.filter(
              (task) => task.completed
            ).length;

            return (
              <article
                key={project.id}
                className="flex flex-col rounded-3xl border border-[#E2EADC] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#234E43]/10"
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#EAF2E8] p-3 text-[#234E43]">
                    <FlaskConical size={25} />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      statusStyles[project.status]
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <p className="text-xs font-bold uppercase tracking-wide text-[#B18B37]">
                  {project.category}
                </p>

                <h3 className="mt-3 text-xl font-bold leading-snug text-[#234E43]">
                  {project.title}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#718579]">
                  {project.description || "No description added yet."}
                </p>

                <div className="mt-6 space-y-3 text-sm text-[#607B6C]">
                  <p className="flex items-center gap-2">
                    <Users size={17} />
                    {project.team}
                  </p>

                  <p className="flex items-center gap-2">
                    <BookOpen size={17} />
                    {project.supervisor}
                  </p>

                  <p className="flex items-center gap-2">
                    <CalendarDays size={17} />
                    Deadline: {project.deadline}
                  </p>
                </div>

                {/* Progress */}
                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#607B6C]">
                      Project Progress
                    </span>

                    <span className="font-extrabold text-[#234E43]">
                      {progress}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-[#EAF2E8]">
                    <div
                      className="h-full rounded-full bg-[#D9A536] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-[#8A9F90]">
                    {completedTasks} of {project.tasks.length} tasks completed
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
                >
                  Manage Project
                  <ArrowUpRight size={18} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-[#E2EADC] bg-white p-12 text-center">
          <FolderKanban
            size={42}
            className="mx-auto text-[#A6C1A4]"
          />
          <h3 className="mt-4 text-xl font-bold text-[#234E43]">
            No Projects Found
          </h3>
          <p className="mt-2 text-[#718579]">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="research-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#B18B37]">
                  {selectedProject.category}
                </p>

                <h2
                  id="research-modal-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  {selectedProject.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close project details"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-[#F6F8F3] p-5 text-sm text-[#45685B] sm:grid-cols-2">
              <p>
                <strong>Supervisor:</strong> {selectedProject.supervisor}
              </p>
              <p>
                <strong>Team:</strong> {selectedProject.team}
              </p>
              <p>
                <strong>Deadline:</strong> {selectedProject.deadline}
              </p>
              <p>
                <strong>Status:</strong> {selectedProject.status}
              </p>
            </div>

            <h3 className="mt-7 font-bold text-[#234E43]">
              Project Description
            </h3>

            <p className="mt-3 leading-relaxed text-[#718579]">
              {selectedProject.description || "No description added."}
            </p>

            <div className="mt-7 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-[#234E43]">
                <ClipboardList size={20} />
                Project Milestones
              </h3>

              <span className="text-sm font-bold text-[#477764]">
                {getProgress(selectedProject)}%
              </span>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EAF2E8]">
              <div
                className="h-full rounded-full bg-[#D9A536]"
                style={{
                  width: `${getProgress(selectedProject)}%`,
                }}
              />
            </div>

            <div className="mt-6 space-y-3">
              {selectedProject.tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2EADC] p-4"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() =>
                      toggleTask(selectedProject.id, task.id)
                    }
                    className="h-5 w-5 accent-[#234E43]"
                  />

                  <span
                    className={`text-sm ${
                      task.completed
                        ? "text-[#8A9F90] line-through"
                        : "font-medium text-[#234E43]"
                    }`}
                  >
                    {task.title}
                  </span>
                </label>
              ))}
            </div>

            {selectedProject.tasks.length === 0 && (
              <p className="mt-5 rounded-xl bg-[#F9FBF8] p-4 text-sm text-[#718579]">
                No milestones added yet. Add your first task below.
              </p>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem(
                  "taskTitle"
                );
                addTask(selectedProject.id, input.value);
                input.value = "";
              }}
              className="mt-6 flex gap-3"
            >
              <input
                name="taskTitle"
                type="text"
                required
                maxLength={120}
                placeholder="Add a new milestone..."
                className="min-w-0 flex-1 rounded-xl border border-[#E2EADC] bg-[#F9FBF8] px-4 py-3 text-sm text-[#234E43] outline-none"
              />

              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-[#D9A536] px-5 py-3 font-bold text-[#234E43]"
              >
                <Plus size={18} />
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#B18B37]">
                  RESEARCH WORKSPACE
                </p>
                <h2
                  id="create-project-title"
                  className="mt-2 text-2xl font-extrabold text-[#234E43]"
                >
                  Create New Project
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close create project form"
                className="rounded-xl p-2 text-[#718579] hover:bg-[#F1F7EF]"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={createProject} className="mt-7 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter project title"
                  className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Research Category
                </label>
                <select
                  value={newProject.category}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#E2EADC] bg-white px-4 py-3 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Supervisor
                </label>
                <input
                  type="text"
                  required
                  value={newProject.supervisor}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      supervisor: e.target.value,
                    })
                  }
                  placeholder="Supervisor name"
                  className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Target Deadline
                </label>
                <input
                  type="date"
                  required
                  value={newProject.deadline}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      deadline: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#E2EADC] px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#234E43]">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  placeholder="Briefly describe your research project..."
                  className="w-full resize-none rounded-xl border border-[#E2EADC] px-4 py-3 text-sm outline-none focus:border-[#A6C1A4]"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#234E43] px-5 py-3.5 font-bold text-white transition hover:bg-[#326657]"
              >
                <Plus size={18} />
                Create Project (Demo)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Demo Note */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#E9DCAE] bg-[#FFF9E9] p-5">
        <AlertCircle size={22} className="shrink-0 text-[#A57921]" />
        <p className="text-sm leading-relaxed text-[#80651E]">
          This is a frontend project management demonstration.
          New projects, milestones, and progress updates are kept in
          React state only and will reset when the page is refreshed.
          Backend storage and collaboration features will be added later.
        </p>
      </div>

      <div className="border-t border-[#E2EADC] pt-5 text-xs text-[#8A9F90]">
        UniBee Student Portal — Research & Projects
      </div>
    </div>
  );
}

export default StudentResearch;
