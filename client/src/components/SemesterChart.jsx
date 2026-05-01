import { Bar } from "react-chartjs-2";

const SemesterChart = ({ semesterData, type = "bar" }) => {
  const data = {
    labels: semesterData.map(s => `Sem ${s.semester}`),
    datasets: [
      {
        label: "Semester Average",
        data: semesterData.map(s => s.avg),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      y: { beginAtZero: false, min: 0, max: 150 },
    },
  };

  return <Bar data={data} options={options} />;
};

export default SemesterChart;
