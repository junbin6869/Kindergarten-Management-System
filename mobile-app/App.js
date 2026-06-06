import React, { useEffect, useState } from "react";
import { Alert, AppState, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";

const API_URL = "http://192.168.1.2:8080/api";

async function request(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

export default function App() {
  const [session, setSession] = useState(null);
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {!session ? <Login onLogin={setSession} /> : <Home session={session} onLogout={() => setSession(null)} />}
    </SafeAreaView>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("parent@kindergarten.test");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  async function submit() {
    try {
      setLoading(true);
      const session = await request("/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (!["PARENT", "TEACHER"].includes(session.user.role)) {
        Alert.alert("Wrong app", "Admin users should use the web dashboard.");
        return;
      }
      onLogin(session);
    } catch {
      Alert.alert("Login failed", "Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <View style={styles.login}>
      <Text style={styles.title}>Kindergarten Mobile</Text>
      <Text style={styles.subtitle}>Parent and teacher app</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      <Button label={loading ? "Signing in..." : "Login"} onPress={submit} />
      <View style={styles.demoBox}>
        <Text style={styles.muted}>Demo accounts</Text>
        <Text>teacher@kindergarten.test / password</Text>
        <Text>parent@kindergarten.test / password</Text>
      </View>
    </View>
  );
}

function Home({ session, onLogout }) {
  const [tab, setTab] = useState(session.user.role === "TEACHER" ? "class" : "children");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const tabs = session.user.role === "TEACHER"
    ? [["class", "My Class"], ["fees", "Fees"]]
    : [["children", "Children"], ["fees", "Fees"]];
  if (selectedStudent) {
    return <StudentDetailScreen student={selectedStudent} session={session} onBack={() => setSelectedStudent(null)} />;
  }
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{session.user.fullName}</Text>
          <Text style={styles.muted}>{session.user.role}</Text>
        </View>
        <Pressable onPress={onLogout}><Text style={styles.link}>Logout</Text></Pressable>
      </View>
      <View style={styles.tabs}>
        {tabs.map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.activeTab]}><Text>{label}</Text></Pressable>)}
      </View>
      {session.user.role === "TEACHER"
        ? <TeacherScreen tab={tab} session={session} onOpenStudent={setSelectedStudent} />
        : <ParentScreen tab={tab} session={session} onOpenStudent={setSelectedStudent} />}
    </View>
  );
}

function TeacherScreen({ tab, session, onOpenStudent }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(localDateString());
  const [attendanceDateInput, setAttendanceDateInput] = useState(localDateString());

  function selectAttendanceDate(value) {
    setAttendanceDate(value);
    setAttendanceDateInput(value);
  }

  useEffect(() => {
    request("/teacher/classes", session.token).then(items => {
      setClasses(items);
      if (items[0]) setSelectedClass(items[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    Promise.all([
      request(`/teacher/classes/${selectedClass.id}/students`, session.token),
      request(`/teacher/classes/${selectedClass.id}/attendance?date=${attendanceDate}`, session.token)
    ]).then(([studentList, attendanceList]) => {
      setStudents(studentList);
      setAttendanceByStudent(Object.fromEntries(attendanceList.map(item => [item.studentId, item.status])));
    });
  }, [selectedClass?.id, attendanceDate]);

  async function mark(studentId, status) {
    await request("/teacher/attendance", session.token, {
      method: "POST",
      body: JSON.stringify({
        studentId,
        attendanceDate,
        status,
        checkInTime: status === "PRESENT" ? "08:00" : null,
        remark: ""
      })
    });
    setAttendanceByStudent(current => ({ ...current, [studentId]: status }));
    Alert.alert("Saved", `${status} recorded for ${attendanceDate}.`);
  }

  return (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>{selectedClass ? selectedClass.name : "No assigned class"}</Text>
      {tab === "class" && (
        <>
          <Text style={styles.cardTitle}>Attendance date</Text>
          <View style={styles.row}>
            <Button small label="Previous" onPress={() => selectAttendanceDate(changeDate(attendanceDate, -1))} />
            <Button small label="Today" onPress={() => selectAttendanceDate(localDateString())} />
            <Button small label="Next" onPress={() => selectAttendanceDate(changeDate(attendanceDate, 1))} />
          </View>
          <View style={styles.dateInputRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={attendanceDateInput}
              onChangeText={setAttendanceDateInput}
              placeholder="YYYY-MM-DD"
            />
            <Button
              small
              label="Apply"
              onPress={() => {
                if (isValidDateString(attendanceDateInput)) selectAttendanceDate(attendanceDateInput);
                else Alert.alert("Invalid date", "Use a valid date in YYYY-MM-DD format.");
              }}
            />
          </View>
          {students.map(student => (
            <TeacherAttendanceCard
              key={student.id}
              student={student}
              status={attendanceByStudent[student.id]}
              attendanceDate={attendanceDate}
              onOpen={() => onOpenStudent(student)}
              onMark={mark}
            />
          ))}
        </>
      )}
      {tab === "fees" && <TeacherFees students={students} token={session.token} />}
    </ScrollView>
  );
}

function ParentScreen({ tab, session, onOpenStudent }) {
  const [children, setChildren] = useState([]);
  useEffect(() => { request("/parent/children", session.token).then(setChildren); }, []);
  return (
    <ScrollView style={styles.content}>
      {tab === "children" && children.map(student => <StudentCard key={student.id} student={student} onPress={() => onOpenStudent(student)} />)}
      {tab === "fees" && <ParentInvoices token={session.token} />}
    </ScrollView>
  );
}

function StudentCard({ student, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Text style={styles.cardTitle}>{student.fullName}</Text>
        <Text>{student.kindergartenClass?.name || "Unassigned"}</Text>
        <Text style={styles.muted}>{student.status}</Text>
      </Card>
    </Pressable>
  );
}

function TeacherAttendanceCard({ student, status, attendanceDate, onOpen, onMark }) {
  return (
    <Card>
      <Pressable onPress={onOpen}>
        <Text style={styles.cardTitle}>{student.fullName}</Text>
        <Text>{student.kindergartenClass?.name || "Unassigned"}</Text>
        <Text style={styles.muted}>{attendanceDate}: {status || "Not marked"}</Text>
      </Pressable>
      <View style={styles.row}>
        <Button small label={status === "PRESENT" ? "Present Done" : "Present"} onPress={() => onMark(student.id, "PRESENT")} />
        <Button small label={status === "ABSENT" ? "Absent Done" : "Absent"} onPress={() => onMark(student.id, "ABSENT")} />
      </View>
    </Card>
  );
}

function StudentDetailScreen({ student, session, onBack }) {
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState("");
  const isTeacher = session.user.role === "TEACHER";
  const load = () => request(isTeacher ? `/teacher/students/${student.id}` : `/parent/children/${student.id}`, session.token).then(setDetail);
  useEffect(() => { load(); }, [student.id]);
  if (!detail) return null;

  const attendance = detail.attendance || [];
  const comments = detail.comments || [];
  const attendanceTotal = attendance.length;
  const attended = attendance.filter(item => item.status === "PRESENT" || item.status === "LATE").length;
  const absenceDates = attendance.filter(item => item.status === "ABSENT").map(item => item.attendanceDate);
  const attendanceRate = attendanceTotal === 0 ? "No attendance yet" : `${Math.round((attended / attendanceTotal) * 100)}%`;

  async function submitComment() {
    const message = comment.trim();
    if (!message) {
      Alert.alert("Comment required", "Please write a message first.");
      return;
    }
    await request(`/teacher/students/${student.id}/comments`, session.token, {
      method: "POST",
      body: JSON.stringify({ message })
    });
    setComment("");
    await load();
    Alert.alert("Saved", "Comment added.");
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{detail.student.fullName}</Text>
          <Text style={styles.muted}>Student detail</Text>
        </View>
        <Pressable onPress={onBack}><Text style={styles.link}>Back</Text></Pressable>
      </View>
      <ScrollView style={styles.content}>
        <Card>
          <Text style={styles.cardTitle}>Student info</Text>
          <Text>Class: {detail.student.kindergartenClass?.name || "Unassigned"}</Text>
          <Text>Status: {detail.student.status}</Text>
          <Text>Date of birth: {detail.student.dateOfBirth || "-"}</Text>
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Attendance rate</Text>
          <Text style={styles.metric}>{attendanceRate}</Text>
          <Text style={styles.muted}>{attended} attended out of {attendanceTotal} records</Text>
          {absenceDates.length > 0 && (
            <View style={styles.absenceList}>
              <Text style={styles.status}>Absent dates</Text>
              {absenceDates.map(date => <Text key={date}>{date}</Text>)}
            </View>
          )}
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Teacher comments</Text>
          {comments.length === 0 && <Text style={styles.muted}>No comments yet.</Text>}
          {comments.map(item => (
            <View key={item.id} style={styles.commentBox}>
              <Text>{item.message}</Text>
              <Text style={styles.muted}>{item.teacherName} - commented at {formatDateTime(item.createdAt)}</Text>
            </View>
          ))}
          {isTeacher && (
            <View style={styles.commentForm}>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={comment}
                onChangeText={setComment}
                placeholder="Write a message for parents..."
                multiline
              />
              <Button label="Add comment" onPress={submitComment} />
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function TeacherFees({ students, token }) {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    Promise.all(students.map(student => request(`/teacher/students/${student.id}`, token)))
      .then(details => setInvoices(details.flatMap(detail => detail.invoices || [])));
  }, [students.map(student => student.id).join(","), token]);
  return sortInvoices(visibleCurrentAndOutstandingInvoices(invoices)).map(invoice => (
    <Card key={invoice.id}>
      <Text style={styles.cardTitle}>{invoice.studentName}</Text>
      <Text>{invoice.billingDetail || invoice.billingMonth} - RM {invoice.amount}</Text>
      <Text>Due: {invoice.dueDate}</Text>
      <Text style={styles.status}>{invoiceDisplayStatus(invoice)}</Text>
    </Card>
  ));
}

function ParentInvoices({ token }) {
  const [invoices, setInvoices] = useState([]);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const load = () => request("/parent/invoices", token).then(setInvoices);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && paymentInProgress) {
        load().finally(() => setPaymentInProgress(false));
      }
    });
    return () => subscription.remove();
  }, [paymentInProgress]);
  async function pay(invoiceId) {
    try {
      const checkout = await request(`/parent/invoices/${invoiceId}/pay`, token, { method: "POST" });
      if (checkout.mock) {
        Alert.alert("Stripe is not configured", "Add STRIPE_SECRET_KEY to backend/.env and restart the backend.");
        return;
      }
      if (!checkout.checkoutUrl) {
        Alert.alert("Payment unavailable", "No checkout URL was returned.");
        return;
      }
      const canOpen = await Linking.canOpenURL(checkout.checkoutUrl);
      if (!canOpen) {
        Alert.alert("Payment unavailable", "This device cannot open the Stripe checkout page.");
        return;
      }
      setPaymentInProgress(true);
      await Linking.openURL(checkout.checkoutUrl);
    } catch (error) {
      Alert.alert("Payment failed", error.message || "Could not start payment.");
      setPaymentInProgress(false);
    }
  }
  return sortInvoices(visibleCurrentAndOutstandingInvoices(invoices)).map(invoice => (
    <Card key={invoice.id}>
      <Text style={styles.cardTitle}>{invoice.studentName}</Text>
      <Text>{invoice.billingDetail || invoice.billingMonth} - RM {invoice.amount}</Text>
      <Text>Due: {invoice.dueDate}</Text>
      <Text style={styles.status}>{invoiceDisplayStatus(invoice)}</Text>
      {invoice.status === "PENDING" && <Button label="Pay" onPress={() => pay(invoice.id)} />}
    </Card>
  ));
}

function sortInvoices(invoices) {
  const today = localDateString();
  const priority = invoice => {
    if (invoice.status === "PENDING" && invoice.dueDate < today) return 0;
    if (invoice.status === "PENDING") return 1;
    return 2;
  };
  return [...invoices].sort((a, b) => priority(a) - priority(b) || String(a.dueDate).localeCompare(String(b.dueDate)));
}

function invoiceDisplayStatus(invoice) {
  return invoice.status === "PENDING" && invoice.dueDate < localDateString() ? "OVERDUE" : invoice.status;
}

function visibleCurrentAndOutstandingInvoices(invoices) {
  const today = localDateString();
  const currentMonth = today.slice(0, 7);
  return invoices.filter(invoice => {
    const invoiceMonth = String(invoice.billingMonth || invoice.dueDate || "").slice(0, 7);
    return invoice.status === "PENDING" || (invoice.status === "PAID" && invoiceMonth === currentMonth);
  });
}

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function changeDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDateString(date) === value;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Button({ label, onPress, small }) {
  return <Pressable onPress={onPress} style={[styles.button, small && styles.smallButton]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff7ed" },
  login: { flex: 1, justifyContent: "center", padding: 24, gap: 14 },
  title: { fontSize: 30, fontWeight: "800", color: "#3b2618" },
  subtitle: { fontSize: 16, color: "#7c6250", marginBottom: 12 },
  input: { backgroundColor: "#fffaf3", borderWidth: 1, borderColor: "#f2d8bf", borderRadius: 8, padding: 14 },
  button: { backgroundColor: "#f97316", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 8, flex: 1 },
  buttonText: { color: "white", fontWeight: "700" },
  demoBox: { marginTop: 20, gap: 4 },
  muted: { color: "#7c6250" },
  link: { color: "#c2410c", fontWeight: "700" },
  shell: { flex: 1 },
  header: { padding: 20, backgroundColor: "#fffaf3", borderBottomWidth: 1, borderBottomColor: "#f2d8bf", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#3b2618" },
  tabs: { flexDirection: "row", gap: 8, padding: 12 },
  tab: { flex: 1, backgroundColor: "#fffaf3", borderRadius: 8, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#f2d8bf" },
  activeTab: { backgroundColor: "#ffedd5", borderColor: "#fdba74" },
  content: { padding: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: "#3b2618" },
  card: { backgroundColor: "#fffaf3", borderColor: "#f2d8bf", borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#3b2618" },
  metric: { fontSize: 32, fontWeight: "800", color: "#f97316" },
  row: { flexDirection: "row", gap: 8 },
  status: { fontWeight: "800", color: "#c2410c" },
  commentBox: { borderTopWidth: 1, borderTopColor: "#f2d8bf", paddingTop: 10, gap: 4 },
  commentForm: { marginTop: 8, gap: 8 },
  absenceList: { marginTop: 8, gap: 4 },
  dateInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateInput: { flex: 1 },
  multilineInput: { minHeight: 90, textAlignVertical: "top" }
});
