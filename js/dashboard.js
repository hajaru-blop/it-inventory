// js/dashboard.js
let rawData = [];
let chartWorkbaseInstance = null;
let chartStatusInstance = null;
let chartCompanyInstance = null;
let chartBrandInstance = null;

// Orange, Black, White and Slate Palette
const COLOR_PALETTE = ['#FF6B2C', '#111827', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB'];

async function fetchDashboardData() {
  const { data, error } = await supabaseClient.from('it_inventory').select('*');
  if (error) {
    console.error('Error fetching inventory data:', error);
    return;
  }
  rawData = data || [];
  populateDropdowns(rawData);
  applyFilters();
}

function populateDropdowns(data) {
  const brands = ['All', ...new Set(data.map(i => i.brand).filter(Boolean))];
  const workbases = ['All', ...new Set(data.map(i => i.workbase).filter(Boolean))];
  const statuses = ['All', ...new Set(data.map(i => i.status).filter(Boolean))];

  updateDropdown('filter-brand', brands);
  updateDropdown('filter-workbase', workbases);
  updateDropdown('filter-status', statuses);
}

function updateDropdown(elementId, options) {
  const select = document.getElementById(elementId);
  const currentVal = select.value;
  select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
  if (options.includes(currentVal)) select.value = currentVal;
}

function applyFilters() {
  const selectedBrand = document.getElementById('filter-brand').value;
  const selectedWorkbase = document.getElementById('filter-workbase').value;
  const selectedStatus = document.getElementById('filter-status').value;

  const filtered = rawData.filter(item => {
    const matchBrand = selectedBrand === 'All' || item.brand === selectedBrand;
    const matchWorkbase = selectedWorkbase === 'All' || item.workbase === selectedWorkbase;
    const matchStatus = selectedStatus === 'All' || item.status === selectedStatus;
    return matchBrand && matchWorkbase && matchStatus;
  });

  updateKPIs(filtered);
  renderCharts(filtered);
}

function resetFilters() {
  document.getElementById('filter-brand').value = 'All';
  document.getElementById('filter-workbase').value = 'All';
  document.getElementById('filter-status').value = 'All';
  applyFilters();
}

function updateKPIs(data) {
  document.getElementById('kpi-total').innerText = data.length;
  document.getElementById('kpi-stock').innerText = data.filter(i => i.status === 'In Stock').length;
  document.getElementById('kpi-use').innerText = data.filter(i => i.status === 'In Use').length;
  document.getElementById('kpi-repair').innerText = data.filter(i => i.status === 'Repair').length;
}

function countByField(data, field) {
  return data.reduce((acc, item) => {
    const val = item[field] || 'Unknown';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function renderCharts(data) {
  // 1. Workbase Pie Chart
  const wbCounts = countByField(data, 'workbase');
  chartWorkbaseInstance = createOrUpdateChart(chartWorkbaseInstance, 'chart-workbase', {
    type: 'pie',
    labels: Object.keys(wbCounts),
    data: Object.values(wbCounts),
    colors: COLOR_PALETTE
  });

  // 2. Status Horizontal Bar Chart
  const statusCounts = countByField(data, 'status');
  chartStatusInstance = createOrUpdateChart(chartStatusInstance, 'chart-status', {
    type: 'bar',
    labels: Object.keys(statusCounts),
    data: Object.values(statusCounts),
    colors: ['#FF6B2C'],
    indexAxis: 'y'
  });

  // 3. Company Doughnut Chart
  const companyCounts = countByField(data, 'company');
  chartCompanyInstance = createOrUpdateChart(chartCompanyInstance, 'chart-company', {
    type: 'doughnut',
    labels: Object.keys(companyCounts),
    data: Object.values(companyCounts),
    colors: COLOR_PALETTE
  });

  // 4. Brand Vertical Bar Chart
  const brandCounts = countByField(data, 'brand');
  chartBrandInstance = createOrUpdateChart(chartBrandInstance, 'chart-brand', {
    type: 'bar',
    labels: Object.keys(brandCounts),
    data: Object.values(brandCounts),
    colors: ['#111827'],
    indexAxis: 'x'
  });
}

function createOrUpdateChart(instance, elementId, config) {
  const ctx = document.getElementById(elementId).getContext('2d');
  if (instance) instance.destroy();

  return new Chart(ctx, {
    type: config.type,
    data: {
      labels: config.labels,
      datasets: [{
        data: config.data,
        backgroundColor: config.colors,
        borderRadius: config.type === 'bar' ? 6 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: config.indexAxis || 'x',
      plugins: {
        legend: {
          display: config.type === 'pie' || config.type === 'doughnut',
          position: 'right',
          labels: { font: { weight: 'bold', size: 11 } }
        }
      },
      scales: config.type === 'bar' ? {
        y: { beginAtZero: true, ticks: { precision: 0, font: { weight: 'bold' } } },
        x: { beginAtZero: true, ticks: { precision: 0, font: { weight: 'bold' } } }
      } : {}
    }
  });
}

function setupRealtime() {
  supabaseClient
    .channel('dashboard-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'it_inventory' }, () => {
      fetchDashboardData();
    })
    .subscribe();
}

fetchDashboardData();
setupRealtime();
