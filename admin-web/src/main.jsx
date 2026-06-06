import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { BookOpen, CreditCard, Filter, GraduationCap, LogOut, Plus, School, Search, Trash2, Users, X } from "lucide-react";
import { api, clearSession, getSession, login } from "./api";
import "./styles.css";

const STUDENT_STATUSES = ["ACTIVE", "GRADUATED", "WITHDRAWN"];
const SuccessContext = createContext(() => {});

function useSuccess() {
  return useContext(SuccessContext);
}

function formatBillId(id) {
  return `BILL-${String(id).padStart(6, "0")}`;
}

function getBillingDetail(invoice) {
  return invoice.billingDetail || invoice.billingMonth;
}

function AppShell() {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState("");
  const session = getSession();
  if (!session) return <Navigate to="/login" />;
  if (session.user.role !== "ADMIN") return <div className="center">Admin web is only for admin users.</div>;
  const nav = [
    ["/students", Users, "Students"],
    ["/classes", School, "Classes"],
    ["/fees", CreditCard, "Bills"]
  ];
  return (
    <SuccessContext.Provider value={setSuccessMessage}>
      <div className="app">
        <aside>
          <div className="brand"><GraduationCap size={24} /> Kinder Admin</div>
          {nav.map(([to, Icon, label]) => <Link key={to} to={to}><Icon size={18} /> {label}</Link>)}
        </aside>
        <main>
          <header>
            <div>
              <strong>{session.user.fullName}</strong>
              <span>{session.user.email}</span>
            </div>
            <button onClick={() => { clearSession(); navigate("/login"); }}><LogOut size={16} /> Logout</button>
          </header>
          <Routes>
            <Route path="/" element={<Navigate to="/students" replace />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetail />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/classes/:id" element={<ClassDetail />} />
            <Route path="/fees" element={<Fees />} />
          </Routes>
        </main>
      </div>
      <SuccessModal message={successMessage} onClose={() => setSuccessMessage("")} />
    </SuccessContext.Provider>
  );
}

function Login() {
  const [email, setEmail] = useState("admin@kindergarten.test");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    try {
      setError("");
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Login failed");
    }
  }
  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>Kindergarten Admin</h1>
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button>Login</button>
      </form>
    </div>
  );
}

function Students() {
  const showSuccess = useSuccess();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ query: "", status: "ACTIVE", classId: "", sortBy: "class" });
  const [showAdd, setShowAdd] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", status: "ACTIVE", classId: "" });
  const load = () => Promise.all([api("/admin/students"), api("/admin/classes")])
    .then(([s, c]) => {
      setLoadError("");
      setStudents(s);
      setClasses(c);
    })
    .catch(error => {
      setLoadError(error.message || "Could not load student data.");
      setStudents([]);
      setClasses([]);
    });
  useEffect(() => { load(); }, []);

  const visibleStudents = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return students
      .filter(s => !query || s.fullName.toLowerCase().includes(query))
      .filter(s => !filters.status || s.status === filters.status)
      .filter(s => !filters.classId || String(s.kindergartenClass?.id) === filters.classId)
      .sort((a, b) => {
        if (filters.sortBy === "name") return a.fullName.localeCompare(b.fullName);
        return (a.kindergartenClass?.name || "").localeCompare(b.kindergartenClass?.name || "") || a.fullName.localeCompare(b.fullName);
      });
  }, [students, filters]);

  const activeStudents = students.filter(s => s.status === "ACTIVE").length;

  async function create(event) {
    event.preventDefault();
    await api("/admin/students", {
      method: "POST",
      body: JSON.stringify({ ...form, classId: form.classId ? Number(form.classId) : null, parentIds: [] })
    });
    setForm({ fullName: "", dateOfBirth: "", status: "ACTIVE", classId: "" });
    setShowAdd(false);
    await load();
    showSuccess("Student record added successfully.");
  }

  return (
    <Page title="Students">
      <div className="summary-row">
        <div className="summary-item"><span>Active students</span><strong>{activeStudents}</strong></div>
        <button onClick={() => setShowAdd(true)}><Plus size={16} /> Add student</button>
      </div>
      {loadError && <p className="error-banner">{loadError}</p>}
      <div className="toolbar">
        <div className="search-field"><Search size={16} /><input placeholder="Search student" value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} /></div>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All status</option>
          {STUDENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={filters.classId} onChange={e => setFilters({ ...filters, classId: e.target.value })}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}>
          <option value="class">Sort by class</option>
          <option value="name">Sort by name</option>
        </select>
      </div>
      <Table
        columns={["Name", "Class", "Status", "Absent this month", ""]}
        rows={visibleStudents.map(s => [
          s.fullName,
          s.kindergartenClass?.name || "Unassigned",
          <span className={`pill ${s.status.toLowerCase()}`}>{s.status}</span>,
          s.monthlyAbsences ?? 0,
          <Link to={`/students/${s.id}`}>Open</Link>
        ])}
      />
      {showAdd && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>Add student</h2>
              <button className="icon-button" onClick={() => setShowAdd(false)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={create}>
              <label>Student name<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
              <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
              <label>Status
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STUDENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>Class
                <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button><Plus size={16} /> Add student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}

function StudentDetail() {
  const showSuccess = useSuccess();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [parent, setParent] = useState({ fullName: "", phone: "", email: "" });
  const load = () => Promise.all([api(`/admin/students/${id}`), api("/admin/classes")]).then(([detail, classList]) => { setData(detail); setClasses(classList); });
  useEffect(() => { load(); }, [id]);

  async function addParent(event) {
    event.preventDefault();
    await api(`/admin/students/${id}/parents`, { method: "POST", body: JSON.stringify(parent) });
    setParent({ fullName: "", phone: "", email: "" });
    await load();
    showSuccess("Parent record added successfully.");
  }

  async function updateStudent(event) {
    event.preventDefault();
    const student = data.student;
    const updated = await api(`/admin/students/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        fullName: student.fullName,
        dateOfBirth: student.dateOfBirth,
        status: student.status,
        classId: student.kindergartenClass?.id || null,
        parentIds: data.parents.map(p => p.id)
      })
    });
    setData({ ...data, student: updated });
    showSuccess("Student record updated successfully.");
  }

  if (!data) return null;
  return (
    <Page title={data.student.fullName}>
      <div className="grid">
        <section>
          <h2>Student</h2>
          <form className="stack" onSubmit={updateStudent}>
            <label>Name<input value={data.student.fullName} onChange={e => setData({ ...data, student: { ...data.student, fullName: e.target.value } })} /></label>
            <label>Date of birth<input type="date" value={data.student.dateOfBirth || ""} onChange={e => setData({ ...data, student: { ...data.student, dateOfBirth: e.target.value } })} /></label>
            <label>Status
              <select value={data.student.status} onChange={e => setData({ ...data, student: { ...data.student, status: e.target.value } })}>
                {STUDENT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>Class
              <select value={data.student.kindergartenClass?.id || ""} onChange={e => {
                const selected = classes.find(c => String(c.id) === e.target.value);
                setData({ ...data, student: { ...data.student, kindergartenClass: selected || null } });
              }}>
                <option value="">Unassigned</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <button>Save student</button>
          </form>
        </section>
        <section>
          <h2>Parents</h2>
          {data.parents.map(p => <p key={p.id}>{p.fullName} | {p.phone} | {p.email}</p>)}
          <form className="stack" onSubmit={addParent}>
            <input placeholder="Parent name" value={parent.fullName} onChange={e => setParent({ ...parent, fullName: e.target.value })} />
            <input placeholder="Phone" value={parent.phone} onChange={e => setParent({ ...parent, phone: e.target.value })} />
            <input placeholder="Email" value={parent.email} onChange={e => setParent({ ...parent, email: e.target.value })} />
            <button>Add parent</button>
          </form>
        </section>
      </div>
      <h2>Attendance</h2>
      <Table columns={["Date", "Status", "Check-in", "Remark"]} rows={data.attendance.map(a => [a.attendanceDate, a.status, a.checkInTime, a.remark])} />
      <h2>Bills</h2>
      <Table columns={["Bill ID", "Billing detail", "Amount", "Due", "Status"]} rows={data.invoices.map(i => [formatBillId(i.id), getBillingDetail(i), `RM ${i.amount}`, i.dueDate, <span className={`pill ${i.status.toLowerCase()}`}>{i.status}</span>])} />
    </Page>
  );
}

function Classes() {
  const showSuccess = useSuccess();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", ageGroup: "", teacherId: "" });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const load = () => Promise.all([api("/admin/classes"), api("/admin/users?role=TEACHER"), api("/admin/students")]).then(([c, t, s]) => { setClasses(c); setTeachers(t); setStudents(s); });
  useEffect(() => { load(); }, []);
  const unassignedStudents = students.filter(s => !s.kindergartenClass);

  async function create(event) {
    event.preventDefault();
    await api("/admin/classes", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        teacherId: form.teacherId ? Number(form.teacherId) : null,
        studentIds: selectedStudentIds
      })
    });
    setForm({ name: "", ageGroup: "", teacherId: "" });
    setSelectedStudentIds([]);
    setShowAdd(false);
    await load();
    showSuccess("Class added successfully.");
  }

  async function deleteClass(classId) {
    if (!confirm("Delete this class? Students in this class will become unassigned.")) return;
    await api(`/admin/classes/${classId}`, { method: "DELETE" });
    await load();
    showSuccess("Class deleted successfully.");
  }

  function toggleStudent(studentId) {
    setSelectedStudentIds(current => current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId]);
  }

  return <Page title="Classes">
    <div className="page-actions">
      <button onClick={() => setShowAdd(true)}><Plus size={16} /> Add class</button>
    </div>
    <Table columns={["Name", "Age group", "Teacher", ""]} rows={classes.map(c => [
      c.name,
      c.ageGroup,
      c.teacher?.fullName || "-",
      <div className="actions">
        <Link to={`/classes/${c.id}`}>Open</Link>
        <button className="danger icon-button" onClick={() => deleteClass(c.id)} title="Delete class"><Trash2 size={16} /></button>
      </div>
    ])} />
    {showAdd && (
      <div className="modal-backdrop">
        <div className="modal modal-wide">
          <div className="modal-header">
            <h2>Add class</h2>
            <button className="icon-button" onClick={() => setShowAdd(false)}><X size={18} /></button>
          </div>
          <form className="stack" onSubmit={create}>
            <label>Class name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Age group<input required value={form.ageGroup} onChange={e => setForm({ ...form, ageGroup: e.target.value })} /></label>
            <label>Teacher
              <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">No teacher assigned</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </label>
            <div>
              <h3>Unassigned students</h3>
              <div className="checklist">
                {unassignedStudents.length === 0 && <p className="muted">No unassigned students.</p>}
                {unassignedStudents.map(student => (
                  <label className="check-row" key={student.id}>
                    <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                    <span>{student.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button><Plus size={16} /> Add class</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </Page>;
}

function ClassDetail() {
  const showSuccess = useSuccess();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [studentsToAdd, setStudentsToAdd] = useState([]);
  const load = () => Promise.all([api(`/admin/classes/${id}`), api("/admin/students")]).then(([detail, studentsList]) => {
    setData(detail);
    setAllStudents(studentsList);
    setStudentsToAdd([]);
  });
  useEffect(() => { load(); }, [id]);
  if (!data) return null;

  const unassignedStudents = allStudents
    .filter(student => !student.kindergartenClass)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  function toggleStudentToAdd(studentId) {
    setStudentsToAdd(current => current.includes(studentId) ? current.filter(id => id !== studentId) : [...current, studentId]);
  }

  async function saveStudentIds(studentIds, message) {
    const updated = await api(`/admin/classes/${id}/students`, {
      method: "PUT",
      body: JSON.stringify({ studentIds })
    });
    const studentsList = await api("/admin/students");
    setData(updated);
    setAllStudents(studentsList);
    setStudentsToAdd([]);
    showSuccess(message);
  }

  async function removeStudent(studentId) {
    await saveStudentIds(data.students.map(s => s.id).filter(existingId => existingId !== studentId), "Student removed from class successfully.");
  }

  async function addStudents(event) {
    event.preventDefault();
    await saveStudentIds([...data.students.map(s => s.id), ...studentsToAdd], "Students added to class successfully.");
    setShowAddStudents(false);
  }

  return (
    <Page title={data.classInfo.name}>
      <div className="grid">
        <section>
          <h2>Class</h2>
          <p>Age group: {data.classInfo.ageGroup}</p>
          <p>Teacher: {data.classInfo.teacher?.fullName || "No teacher assigned"}</p>
          <p>Email: {data.classInfo.teacher?.email || "-"}</p>
        </section>
        <section>
          <h2>Summary</h2>
          <p>Total students: {data.students.length}</p>
          <p>Active students: {data.students.filter(s => s.status === "ACTIVE").length}</p>
        </section>
      </div>
      <div className="section-header">
        <h2>Class roster</h2>
      </div>
      <section>
        <Table columns={["Name", "Status", ""]} rows={data.students.map(s => [
          s.fullName,
          <span className={`pill ${s.status.toLowerCase()}`}>{s.status}</span>,
          <div className="actions">
            <Link to={`/students/${s.id}`}>Open</Link>
            <button className="secondary icon-button" onClick={() => removeStudent(s.id)} title="Remove from class"><X size={16} /></button>
          </div>
        ])} />
        <div className="roster-actions">
          <button onClick={() => setShowAddStudents(true)}><Plus size={16} /> Add student</button>
        </div>
      </section>
      {showAddStudents && (
        <div className="modal-backdrop">
          <div className="modal modal-wide">
            <div className="modal-header">
              <h2>Add students to class</h2>
              <button className="icon-button" onClick={() => setShowAddStudents(false)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={addStudents}>
              <div className="checklist tall">
                {unassignedStudents.length === 0 && <p className="muted">No unassigned students.</p>}
                {unassignedStudents.map(student => (
                  <label className="check-row" key={student.id}>
                    <input type="checkbox" checked={studentsToAdd.includes(student.id)} onChange={() => toggleStudentToAdd(student.id)} />
                    <span>{student.fullName}</span>
                    <small>Unassigned</small>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAddStudents(false)}>Cancel</button>
                <button disabled={studentsToAdd.length === 0}><Plus size={16} /> Add selected</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}

function Fees() {
  const showSuccess = useSuccess();
  const [invoices, setInvoices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ studentName: "", billingDetail: "", status: "", overdueOnly: false, dueAfter: "", dueBefore: "" });
  const [filters, setFilters] = useState({ studentName: "", billingDetail: "", status: "", overdueOnly: false, dueAfter: "", dueBefore: "" });
  const [form, setForm] = useState({ billingDetail: "", amount: "650.00", dueDate: "", classId: "" });
  const load = () => Promise.all([api("/admin/invoices"), api("/admin/classes")]).then(([i, c]) => { setInvoices(i); setClasses(c); });
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = invoice => invoice.status === "PENDING" && invoice.dueDate && invoice.dueDate < today;
  const pendingBills = invoices.filter(invoice => invoice.status === "PENDING");
  const overdueBills = invoices.filter(isOverdue);
  const visibleInvoices = useMemo(() => invoices
    .filter(invoice => !filters.studentName.trim() || invoice.studentName.toLowerCase().includes(filters.studentName.trim().toLowerCase()))
    .filter(invoice => !filters.billingDetail.trim() || getBillingDetail(invoice).toLowerCase().includes(filters.billingDetail.trim().toLowerCase()))
    .filter(invoice => !filters.status || invoice.status === filters.status)
    .filter(invoice => !filters.overdueOnly || isOverdue(invoice))
    .filter(invoice => !filters.dueAfter || invoice.dueDate >= filters.dueAfter)
    .filter(invoice => !filters.dueBefore || invoice.dueDate <= filters.dueBefore), [invoices, filters]);

  async function generate(event) {
    event.preventDefault();
    await api("/admin/invoices/generate", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount), classId: form.classId ? Number(form.classId) : null }) });
    setShowGenerate(false);
    await load();
    showSuccess("Bills generated successfully.");
  }

  function applyFilters(event) {
    event.preventDefault();
    setFilters(draftFilters);
    setShowFilters(false);
    showSuccess("Advanced filters applied successfully.");
  }

  function clearFilters() {
    const emptyFilters = { studentName: "", billingDetail: "", status: "", overdueOnly: false, dueAfter: "", dueBefore: "" };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setShowFilters(false);
    showSuccess("Advanced filters cleared successfully.");
  }

  async function deleteBill(invoiceId) {
    if (!confirm("Delete this bill? This action cannot be undone.")) return;
    await api(`/admin/invoices/${invoiceId}`, { method: "DELETE" });
    await load();
    showSuccess("Bill deleted successfully.");
  }

  return <Page title="Bills">
    <div className="summary-row">
      <div className="summary-item"><span>Pending bills</span><strong>{pendingBills.length}</strong></div>
      <div className="summary-item overdue"><span>Overdue bills</span><strong>{overdueBills.length}</strong></div>
    </div>
    <div className="page-actions split-actions">
      <button className="secondary" onClick={() => { setDraftFilters(filters); setShowFilters(true); }}><Filter size={16} /> Advanced filter</button>
      <button onClick={() => setShowGenerate(true)}><BookOpen size={16} /> Generate bills</button>
    </div>
    <Table columns={["Bill ID", "Student", "Billing detail", "Amount", "Due", "Status", ""]} rows={visibleInvoices.map(i => [
      formatBillId(i.id),
      i.studentName,
      getBillingDetail(i),
      `RM ${i.amount}`,
      i.dueDate,
      <span className={`pill ${isOverdue(i) ? "overdue" : i.status.toLowerCase()}`}>{isOverdue(i) ? "OVERDUE" : i.status}</span>,
      <button className="danger icon-button" onClick={() => deleteBill(i.id)} title="Delete bill"><Trash2 size={16} /></button>
    ])} />
    {showFilters && (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <h2>Advanced filter</h2>
            <button className="icon-button" onClick={() => setShowFilters(false)}><X size={18} /></button>
          </div>
          <form className="stack" onSubmit={applyFilters}>
            <label>Student name<input placeholder="Student name contains..." value={draftFilters.studentName} onChange={e => setDraftFilters({ ...draftFilters, studentName: e.target.value })} /></label>
            <label>Billing detail<input placeholder="Billing detail contains..." value={draftFilters.billingDetail} onChange={e => setDraftFilters({ ...draftFilters, billingDetail: e.target.value })} /></label>
            <label>Status
              <select value={draftFilters.status} onChange={e => setDraftFilters({ ...draftFilters, status: e.target.value })}>
                <option value="">All status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>
            <label>Due date from<input type="date" value={draftFilters.dueAfter} onChange={e => setDraftFilters({ ...draftFilters, dueAfter: e.target.value })} /></label>
            <label>Due date to<input type="date" value={draftFilters.dueBefore} onChange={e => setDraftFilters({ ...draftFilters, dueBefore: e.target.value })} /></label>
            <label className="check-row inline-check">
              <input type="checkbox" checked={draftFilters.overdueOnly} onChange={e => setDraftFilters({ ...draftFilters, overdueOnly: e.target.checked })} />
              <span>Passed due date only</span>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={clearFilters}>Clear</button>
              <button><Filter size={16} /> Apply filters</button>
            </div>
          </form>
        </div>
      </div>
    )}
    {showGenerate && (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <h2>Generate bills</h2>
            <button className="icon-button" onClick={() => setShowGenerate(false)}><X size={18} /></button>
          </div>
          <form className="stack" onSubmit={generate}>
            <label>Billing detail<input required placeholder="Tuition fee, Misc fee..." value={form.billingDetail} onChange={e => setForm({ ...form, billingDetail: e.target.value })} /></label>
            <label>Amount<input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
            <label>Due date<input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
            <label>Class
              <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                <option value="">All classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
              <button>Generate</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </Page>;
}

function SuccessModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal notice-modal">
        <div className="modal-header">
          <h2>Action successful</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

function Page({ title, children }) {
  return <div className="page"><h1>{title}</h1>{children}</div>;
}

function Table({ columns, rows }) {
  return <table><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>;
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  </BrowserRouter>
);
