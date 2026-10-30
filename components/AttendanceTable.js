export default function AttendanceTable({ students, timezone }) {
  const time = value => value ? new Date(value).toLocaleTimeString('en-IN', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }) : '—';
  return <div className="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>First entry</th><th>Last exit</th></tr></thead>
    <tbody>{students.map(student => <tr key={student.student_id}>
      <td><strong>{student.name}</strong><small>{student.student_id}</small></td><td>{student.batch_id}</td>
      <td><span className={`badge ${student.first_in ? 'present' : 'absent'}`}>{student.first_in ? 'Present' : 'Absent'}</span></td>
      <td>{time(student.first_in)}</td><td>{time(student.last_out)}</td></tr>)}</tbody></table>
    {!students.length && <p className="empty">No students match this view.</p>}</div>;
}
