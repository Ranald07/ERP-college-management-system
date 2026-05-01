const MarksTable = ({ subjects }) => {
  if (!subjects || !subjects.length) return <p>No subjects found.</p>;

  return (
    <table className="marks-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Internal</th>
          <th>External</th>
          <th>Total</th>
          <th>Max</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((s, i) => (
          <tr key={i}>
            <td>{s.name}</td>
            <td>{s.internal}</td>
            <td>{s.external}</td>
            <td>{s.total}</td>
            <td>{s.max}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MarksTable;
