// js/inventory.js
let inventoryData = [];

async function fetchInventory() {
  const { data, error } = await supabaseClient.from('it_inventory').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }
  
  // Normalize workbase to UPPERCASE (e.g. kl -> KL)
  inventoryData = (data || []).map(item => ({
    ...item,
    workbase: item.workbase ? item.workbase.trim().toUpperCase() : ''
  }));

  renderTable(inventoryData);
}

function renderTable(data) {
  const tbody = document.getElementById('inventory-tbody');
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400 font-bold">No equipment found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr class="hover:bg-slate-100/60 transition">
      <td class="px-6 py-4 font-extrabold text-black">${escapeHtml(item.company || '-')}</td>
      <td class="px-6 py-4 font-bold text-slate-700">${escapeHtml(item.name || '-')}</td>
      <td class="px-6 py-4 font-bold text-slate-700">${escapeHtml(item.model || '-')}</td>
      <td class="px-6 py-4 font-bold text-slate-700">${escapeHtml(item.brand || '-')}</td>
      <td class="px-6 py-4 font-extrabold text-black">${escapeHtml((item.workbase || '-').toUpperCase())}</td>
      <td class="px-6 py-4">
        <span class="px-3 py-1 text-xs font-extrabold rounded-full ${getStatusStyle(item.status)}">
          ${escapeHtml(item.status || '-')}
        </span>
      </td>
      <td class="px-6 py-4 text-right space-x-3">
        <button onclick="openEditModal('${item.id}')" class="text-xs font-extrabold text-slate-800 hover:text-[#ff6b2c] uppercase tracking-wider transition">Edit</button>
        <button onclick="deleteItem('${item.id}')" class="text-xs font-extrabold text-red-600 hover:text-red-800 uppercase tracking-wider transition">Delete</button>
      </td>
    </tr>
  `).join('');
}

function getStatusStyle(status) {
  switch (status) {
    case 'In Use': return 'bg-emerald-100 text-emerald-800';
    case 'In Stock': return 'bg-blue-100 text-blue-800';
    case 'Repair': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-200 text-slate-700';
  }
}

function filterInventory() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const filtered = inventoryData.filter(item => 
    (item.company && item.company.toLowerCase().includes(query)) ||
    (item.name && item.name.toLowerCase().includes(query)) ||
    (item.model && item.model.toLowerCase().includes(query)) ||
    (item.brand && item.brand.toLowerCase().includes(query)) ||
    (item.workbase && item.workbase.toLowerCase().includes(query)) ||
    (item.status && item.status.toLowerCase().includes(query))
  );
  renderTable(filtered);
}

function openAddModal() {
  document.getElementById('modal-title').innerText = 'Add New Equipment';
  document.getElementById('item-id').value = '';
  document.getElementById('item-form').reset();
  document.getElementById('item-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const item = inventoryData.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modal-title').innerText = 'Edit Equipment';
  document.getElementById('item-id').value = item.id;
  document.getElementById('item-company').value = item.company || '';
  document.getElementById('item-name').value = item.name || '';
  document.getElementById('item-model').value = item.model || '';
  document.getElementById('item-brand').value = item.brand || '';
  document.getElementById('item-workbase').value = (item.workbase || '').toUpperCase();
  document.getElementById('item-status').value = item.status || 'In Use';

  document.getElementById('item-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('item-modal').classList.add('hidden');
}

async function handleSaveItem(e) {
  e.preventDefault();
  const id = document.getElementById('item-id').value;
  const payload = {
    company: document.getElementById('item-company').value.trim(),
    name: document.getElementById('item-name').value.trim(),
    model: document.getElementById('item-model').value.trim(),
    brand: document.getElementById('item-brand').value.trim(),
    workbase: document.getElementById('item-workbase').value.trim().toUpperCase(), // Force uppercase Workbase
    status: document.getElementById('item-status').value
  };

  let error;
  if (id) {
    // Update existing item
    const res = await supabaseClient.from('it_inventory').update(payload).eq('id', id);
    error = res.error;
  } else {
    // Insert new item
    const res = await supabaseClient.from('it_inventory').insert([payload]);
    error = res.error;
  }

  if (error) {
    alert('Failed to save record: ' + error.message);
  } else {
    closeModal();
    fetchInventory();
  }
}

async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this equipment?')) return;
  const { error } = await supabaseClient.from('it_inventory').delete().eq('id', id);
  if (error) {
    alert('Failed to delete item: ' + error.message);
  } else {
    fetchInventory();
  }
}

function exportToExcel() {
  const exportData = inventoryData.map(({ id, created_at, ...rest }) => rest);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
  XLSX.writeFile(workbook, "Reservoir_Link_IT_Inventory.xlsx");
}

function importFromExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      const formatted = jsonData.map(row => ({
        company: row.Company || row.company || '',
        name: row.Name || row.name || 'EQUIPMENT',
        model: row.Model || row.model || '',
        brand: row.Brand || row.brand || '',
        workbase: String(row.Workbase || row.workbase || 'KL').trim().toUpperCase(),
        status: row.Status || row.status || 'In Stock'
      }));

      const { error } = await supabaseClient.from('it_inventory').insert(formatted);
      if (error) alert('Import failed: ' + error.message);
      else fetchInventory();
    } catch (err) {
      alert('Invalid Excel file format.');
    }
  };
  reader.readAsArrayBuffer(file);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupRealtime() {
  supabaseClient
    .channel('inventory-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'it_inventory' }, () => {
      fetchInventory();
    })
    .subscribe();
}

fetchInventory();
setupRealtime();
