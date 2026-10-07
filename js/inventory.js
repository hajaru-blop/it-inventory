// js/inventory.js
let rawInventoryData = [];

async function loadInventory() {
  const { data, error } = await supabaseClient.from('it_inventory').select('*').order('id', { ascending: true });
  if (error) {
    alert('Error loading inventory: ' + error.message);
    return;
  }
  rawInventoryData = data || [];
  renderTable(rawInventoryData);
}

function renderTable(data) {
  const tbody = document.getElementById('inventory-tbody');
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">No equipment records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-6 py-4 font-semibold text-slate-800">${item.company}</td>
      <td class="px-6 py-4">${item.name}</td>
      <td class="px-6 py-4 font-mono text-xs">${item.model}</td>
      <td class="px-6 py-4">${item.brand}</td>
      <td class="px-6 py-4">${item.workbase}</td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.status === 'In Use' ? 'bg-green-100 text-green-700' :
          item.status === 'In Stock' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }">
          ${item.status}
        </span>
      </td>
      <td class="px-6 py-4 text-right">
        <button onclick="deleteItem(${item.id})" class="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
      </td>
    </tr>
  `).join('');
}

function filterInventory() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const filtered = rawInventoryData.filter(item => 
    item.company.toLowerCase().includes(query) ||
    item.name.toLowerCase().includes(query) ||
    item.model.toLowerCase().includes(query) ||
    item.brand.toLowerCase().includes(query) ||
    item.workbase.toLowerCase().includes(query)
  );
  renderTable(filtered);
}

async function handleAddItem(e) {
  e.preventDefault();
  const newItem = {
    company: document.getElementById('add-company').value,
    name: document.getElementById('add-name').value,
    model: document.getElementById('add-model').value,
    brand: document.getElementById('add-brand').value,
    workbase: document.getElementById('add-workbase').value,
    status: document.getElementById('add-status').value
  };

  const { error } = await supabaseClient.from('it_inventory').insert([newItem]);
  if (error) {
    alert('Error adding item: ' + error.message);
  } else {
    closeModal();
    document.getElementById('add-form').reset();
    loadInventory();
  }
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    const { error } = await supabaseClient.from('it_inventory').delete().eq('id', id);
    if (error) alert('Error deleting item: ' + error.message);
    else loadInventory();
  }
}

function exportToExcel() {
  if (rawInventoryData.length === 0) return alert('No data available to export.');
  const exportRows = rawInventoryData.map(item => ({
    Company: item.company, Name: item.name, Model: item.model, Brand: item.brand, Workbase: item.workbase, Status: item.status
  }));
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
  XLSX.writeFile(workbook, "IT_Inventory_Report.xlsx");
}

function importFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (jsonData.length === 0) return alert('The selected Excel file is empty.');

    const formattedRows = jsonData.map(row => ({
      company: row.Company || row.company || 'N/A',
      name: row.Name || row.name || 'N/A',
      model: row.Model || row.model || 'N/A',
      brand: row.Brand || row.brand || 'N/A',
      workbase: row.Workbase || row.workbase || 'N/A',
      status: row.Status || row.status || 'In Use'
    }));

    const { error } = await supabaseClient.from('it_inventory').insert(formattedRows);
    if (error) alert('Error importing Excel data: ' + error.message);
    else {
      alert(`Successfully imported ${formattedRows.length} items from Excel!`);
      loadInventory();
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}

function openModal() { document.getElementById('add-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('add-modal').classList.add('hidden'); }

// Initialize data load
loadInventory();
