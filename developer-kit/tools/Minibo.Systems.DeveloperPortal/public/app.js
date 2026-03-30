const form = document.getElementById('account-form');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const packageKindInput = document.getElementById('packageKind');
const tabs = [...document.querySelectorAll('.tab')];
const rolesInput = document.getElementById('roles');
const permissionsInput = document.getElementById('permissions');
const usernameInput = document.getElementById('username');
const displayNameInput = document.getElementById('displayName');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('is-active'));
    tab.classList.add('is-active');
    packageKindInput.value = tab.dataset.kind;

    if (tab.dataset.kind === 'bootstrap') {
      usernameInput.value = 'admin';
      displayNameInput.value = 'Primary Administrator';
      rolesInput.value = 'SuperAdmin';
      permissionsInput.value = '*';
      return;
    }

    usernameInput.value = 'user1';
    displayNameInput.value = 'New User';
    rolesInput.value = 'User';
    permissionsInput.value = 'DASHBOARD_VIEW,PRODUCTION_EDIT';
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const body = {
    packageKind: packageKindInput.value,
    username: document.getElementById('username').value.trim(),
    displayName: document.getElementById('displayName').value.trim(),
    password: document.getElementById('password').value,
    targetInstance: document.getElementById('targetInstance').value.trim(),
    expiresDays: Number(document.getElementById('expiresDays').value || 7),
    operator: document.getElementById('operator').value.trim(),
    roles: document.getElementById('roles').value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    permissions: document.getElementById('permissions').value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    signatureSvg: document.getElementById('signatureSvg').value.trim() || null
  };

  statusEl.textContent = 'جاري إنشاء الملف...';

  try {
    const response = await fetch('/api/generate-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!response.ok) {
      statusEl.textContent = result.message || 'فشل إنشاء الملف.';
      return;
    }

    output.textContent = JSON.stringify(result.package, null, 2);
    statusEl.textContent = `تم إنشاء ${result.fileName}`;

    const blob = new Blob([JSON.stringify(result.package, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch {
    statusEl.textContent = 'تعذر الاتصال ببوابة المطورين.';
  }
});
