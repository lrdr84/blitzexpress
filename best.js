
    // --- CONFIGURATION ---
    const ADMIN_PASSWORD = "admin123";
    const MAX_TASK_RADIUS_KM = 3.0; // 8km radius limit
    let isAdminAuthenticated = false;
    let selectedTaskId = null; // Stores task selected by rider

    // Initial Seed Tasks using Mijas Pasta
    const initialTasks = [
      {
        id: "TSK-101",
        pickupName: "Mijas Pasta Order #1",
        lat: 4.6062,
        lng: 7.7664,
        dropoff: "Nearby Delivery Hub",
        dropLat: 4.6120,
        dropLng: 7.7710,
        pay: "₦1,000"
      }
    ];

    // Extract decimal places from dropoff latitude as confirmation code
    function getLatDecimalCode(dropLat) {
      const latStr = dropLat.toString();
      const parts = latStr.split('.');
      return parts.length > 1 ? parts[1] : parts[0];
    }

    function getTasks() {
      const stored = localStorage.getItem('dispatch_tasks');
      if (!stored) {
        localStorage.setItem('dispatch_tasks', JSON.stringify(initialTasks));
        return initialTasks;
      }
      return JSON.parse(stored);
    }

    function saveTasks(tasks) {
      localStorage.setItem('dispatch_tasks', JSON.stringify(tasks));
    }

    // --- Tab Navigation ---
    const showAdminBtn = document.getElementById('showAdminBtn');
    const showRiderBtn = document.getElementById('showRiderBtn');
    const adminAuthCard = document.getElementById('adminAuthCard');
    const adminView = document.getElementById('adminView');
    const riderView = document.getElementById('riderView');

    showAdminBtn.addEventListener('click', () => {
      showAdminBtn.classList.add('active');
      showRiderBtn.classList.remove('active');
      riderView.classList.add('hidden');

      if (isAdminAuthenticated) {
        adminView.classList.remove('hidden');
        adminAuthCard.classList.add('hidden');
        renderAdminTasks();
      } else {
        adminAuthCard.classList.remove('hidden');
        adminView.classList.add('hidden');
      }
    });

    showRiderBtn.addEventListener('click', () => {
      showRiderBtn.classList.add('active');
      showAdminBtn.classList.remove('active');
      adminAuthCard.classList.add('hidden');
      adminView.classList.add('hidden');
      riderView.classList.remove('hidden');
    });

    // --- Admin Authentication ---
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPasswordInput = document.getElementById('adminPassword');
    const authError = document.getElementById('authError');

    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (adminPasswordInput.value === ADMIN_PASSWORD) {
        isAdminAuthenticated = true;
        authError.classList.add('hidden');
        adminPasswordInput.value = "";
        adminAuthCard.classList.add('hidden');
        adminView.classList.remove('hidden');
        renderAdminTasks();
      } else {
        authError.classList.remove('hidden');
      }
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
      isAdminAuthenticated = false;
      adminView.classList.add('hidden');
      adminAuthCard.classList.remove('hidden');
    });

    // --- Admin Dashboard Logic ---
    const hubPreset = document.getElementById('hubPreset');
    const pickupLat = document.getElementById('pickupLat');
    const pickupLng = document.getElementById('pickupLng');
    const createTaskForm = document.getElementById('createTaskForm');

    hubPreset.addEventListener('change', () => {
      if (hubPreset.value !== 'custom') {
        const [lat, lng] = hubPreset.value.split(',');
        pickupLat.value = lat;
        pickupLng.value = lng;
      }
    });

    createTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const tasks = getTasks();

      const newTask = {
        id: "TSK-" + Math.floor(100 + Math.random() * 900),
        pickupName: document.getElementById('taskTitle').value,
        lat: parseFloat(pickupLat.value),
        lng: parseFloat(pickupLng.value),
        dropoff: document.getElementById('dropoffLocation').value,
        dropLat: parseFloat(document.getElementById('dropoffLat').value),
        dropLng: parseFloat(document.getElementById('dropoffLng').value),
        pay: document.getElementById('deliveryPay').value
      };

      tasks.unshift(newTask);
      saveTasks(tasks);

      createTaskForm.reset();
      // Reset preset values after form clear
      hubPreset.value = "4.6062,7.7664";
      pickupLat.value = "4.6062";
      pickupLng.value = "7.7664";

      alert('New delivery task posted successfully!');
      renderAdminTasks();
    });

    function renderAdminTasks() {
      const tasks = getTasks();
      const adminTaskList = document.getElementById('adminTaskList');
      adminTaskList.innerHTML = "";

      if (tasks.length === 0) {
        adminTaskList.innerHTML = `<p style="color: #64748b; font-size: 0.9rem;">No active tasks posted.</p>`;
        return;
      }

      tasks.forEach((task) => {
        const code = getLatDecimalCode(task.dropLat);
        const item = document.createElement('div');
        item.className = 'admin-task-item';
        item.innerHTML = `
          <div>
            <strong>${task.pickupName}</strong> (${task.pay})<br>
            <span style="color: #64748b; font-size: 0.8rem;">
              Dropoff Lat: ${task.dropLat} ➔ <strong>Confirmation Code (Decimal):</strong> <span style="color:var(--primary); font-weight:bold;">${code}</span>
            </span>
          </div>
          <button class="delete-btn" onclick="deleteTask('${task.id}')">Delete</button>
        `;
        adminTaskList.appendChild(item);
      });
    }

    function deleteTask(id) {
      let tasks = getTasks();
      tasks = tasks.filter(t => t.id !== id);
      saveTasks(tasks);
      renderAdminTasks();
    }

    // --- Rider Portal Logic ---
    let userLat = null;
    let userLng = null;

    function calculateDistanceKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    function fetchLocation(callback) {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLat = pos.coords.latitude;
          userLng = pos.coords.longitude;
          callback(true);
        },
        (err) => {
          console.error(err);
          callback(false);
        }
      );
    }

    document.getElementById('checkLocBtn').addEventListener('click', () => {
      const regLocStatus = document.getElementById('regLocStatus');
      regLocStatus.textContent = "Acquiring GPS Signal...";
      regLocStatus.className = "status-msg";

      fetchLocation((success) => {
        if (success) {
          regLocStatus.textContent = "Location verified successfully!";
          regLocStatus.className = "status-msg success";
          document.getElementById('regSubmitBtn').disabled = false;
        } else {
          regLocStatus.textContent = "Failed to access location. Enable GPS to proceed.";
          regLocStatus.className = "status-msg error";
        }
      });
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('fullName').value;
      const phone = document.getElementById('phoneNumber').value;

      document.getElementById('riderGreeting').textContent = `Hi, ${name}`;
      document.getElementById('riderPhone').textContent = phone;

      document.getElementById('registrationCard').classList.add('hidden');
      document.getElementById('taskMenuCard').classList.remove('hidden');

      renderRiderTasks();
    });

    function renderRiderTasks() {
      const tasks = getTasks();
      const riderTaskList = document.getElementById('riderTaskList');
      riderTaskList.innerHTML = "";

      if (tasks.length === 0) {
        riderTaskList.innerHTML = `<p style="color: #64748b; font-size: 0.9rem;">No tasks posted by admin yet.</p>`;
        return;
      }

      tasks.forEach((task) => {
        const dist = calculateDistanceKm(userLat, userLng, task.lat, task.lng);
        const inVicinity = dist <= MAX_TASK_RADIUS_KM;
        const isSelected = selectedTaskId === task.id;

        const card = document.createElement('div');
        card.className = 'task-card';

        let buttonHTML = '';
        let codeBoxHTML = '';

        if (isSelected) {
          buttonHTML = `<button class="btn" style="background-color: #64748b;" onclick="deselectTask()">Cancel Selection</button>`;
          codeBoxHTML = `
            <div class="code-verification-box">
              <label for="codeBoxInput_${task.id}">Enter Dropoff Confirmation Code (Decimal of Dropoff Latitude):</label>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <input type="text" id="codeBoxInput_${task.id}" placeholder="e.g. 6120">
                <button class="btn" style="width: auto; padding: 0 16px;" onclick="verifyTaskCode('${task.id}')">Verify</button>
              </div>
              <div id="codeErr_${task.id}" class="status-msg error hidden" style="margin-top: 6px;">
                Incorrect confirmation code!
              </div>
            </div>
          `;
        } else {
          buttonHTML = `
            <button class="btn" ${!inVicinity ? 'disabled' : ''} onclick="selectTask('${task.id}')">
              ${inVicinity ? 'Select Task' : 'Too Far to Select'}
            </button>
          `;
        }

        card.innerHTML = `
          <div class="task-header">
            <span>${task.pickupName}</span>
            <span class="task-pay">${task.pay}</span>
          </div>
          <div class="task-detail"><strong>Dropoff Address:</strong> ${task.dropoff}</div>
          <div class="task-detail" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span>Distance to pickup: <strong>${dist.toFixed(1)} km</strong></span>
            <span class="badge ${isSelected ? 'active' : (inVicinity ? 'near' : 'far')}">
              ${isSelected ? 'In Progress' : (inVicinity ? 'In Vicinity' : 'Out of Range')}
            </span>
          </div>
          ${buttonHTML}
          ${codeBoxHTML}
        `;

        riderTaskList.appendChild(card);
      });
    }

    document.getElementById('refreshLocBtn').addEventListener('click', () => {
      fetchLocation((success) => {
        if (success) renderRiderTasks();
      });
    });

    function selectTask(taskId) {
      selectedTaskId = taskId;
      renderRiderTasks();
    }

    function deselectTask() {
      selectedTaskId = null;
      renderRiderTasks();
    }

    function verifyTaskCode(taskId) {
      const tasks = getTasks();
      const task = tasks.find(t => t.id === taskId);
      const input = document.getElementById(`codeBoxInput_${taskId}`).value.trim();
      const codeErr = document.getElementById(`codeErr_${taskId}`);

      const expectedCode = getLatDecimalCode(task.dropLat);

      const cleanInput = input.replace(/\D/g, '');
      const cleanExpected = expectedCode.replace(/\D/g, '');

      if (cleanInput && (cleanExpected.startsWith(cleanInput) || cleanInput === cleanExpected)) {
        alert(`Task ${task.id} Complete & Verified!\n\nDelivery payout: ${task.pay}`);
        deleteTask(taskId);
        selectedTaskId = null;
        renderRiderTasks();
      } else {
        codeErr.classList.remove('hidden');
      }
    }