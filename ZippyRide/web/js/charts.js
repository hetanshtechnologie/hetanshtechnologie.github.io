let tripChart = null, revenueChart = null

async function loadDashboardCharts() {
  try {
    const { data: trips } = await sb.from('trips')
      .select('created_at, fare_final, status')
      .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString())
      .order('created_at')

    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5)
      days.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }))
    }

    const dayCounts = new Array(7).fill(0)
    const dayRevenue = new Array(7).fill(0)

    if (trips) {
      trips.forEach(t => {
        const diff = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 864e5)
        if (diff >= 0 && diff < 7) {
          const idx = 6 - diff
          dayCounts[idx]++
          if (t.status === 'completed' && t.fare_final) {
            dayRevenue[idx] += Number(t.fare_final)
          }
        }
      })
    }

    const ctx1 = document.getElementById('chart-trips')
    if (ctx1) {
      if (tripChart) tripChart.destroy()
      tripChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [{
            label: 'Trips',
            data: dayCounts,
            backgroundColor: '#4fc3f7',
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: '#25253e' } },
            x: { ticks: { color: '#888' }, grid: { display: false } }
          }
        }
      })
    }

    const ctx2 = document.getElementById('chart-revenue')
    if (ctx2) {
      if (revenueChart) revenueChart.destroy()
      revenueChart = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Revenue',
            data: dayRevenue,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#4caf50',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#888', callback: v => '₹' + v }, grid: { color: '#25253e' } },
            x: { ticks: { color: '#888' }, grid: { display: false } }
          }
        }
      })
    }
  } catch (e) {
    console.error('Chart load error:', e)
  }
}
