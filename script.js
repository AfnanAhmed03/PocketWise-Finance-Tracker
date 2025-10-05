// script.js (New Version with Sheets)

// Firebase Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// ---- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ----
const firebaseConfig = {
    apiKey: "AIzaSyCExeZkzTXsoCAmjxpGZt4u8X_8d1akbIg",
    authDomain: "pocketwise-4ee8f.firebaseapp.com",
    projectId: "pocketwise-4ee8f",
    storageBucket: "pocketwise-4ee8f.firebasestorage.app",
    messagingSenderId: "217196064801",
    appId: "1:217196064801:web:179b9a6fb570bb71ca3360",
    measurementId: "G-P6W5SZWVK9"
  };
// ----------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL STATE ---
let currentSheetId = null; // To track the currently selected sheet

// --- DOM ELEMENTS ---
// Auth
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
// Transactions
const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
// Summary
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');
// Theme
const themeToggleBtn = document.getElementById('theme-toggle');
// NEW: Sheets
const sheetSelector = document.getElementById('sheet-selector');
const newSheetBtn = document.getElementById('new-sheet-btn');

// --- AUTHENTICATION ---
const provider = new GoogleAuthProvider();
loginBtn.onclick = () => signInWithPopup(auth, provider);
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        // MODIFIED: Load sheets first when user logs in
        loadSheets(user.uid);
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        currentSheetId = null; // Reset sheet on logout
    }
});

// --- THEME TOGGLING --- (No changes here)
const setTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
    }
    lucide.createIcons();
};
themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
});
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

// --- NEW: SHEET MANAGEMENT ---

// Load all sheets for the current user
function loadSheets(uid) {
    const q = query(collection(db, 'sheets'), where("uid", "==", uid));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            // If user has no sheets, prompt to create one
            createNewSheet(uid, "My First Sheet");
            return;
        }

        sheetSelector.innerHTML = ''; // Clear previous options
        snapshot.forEach(doc => {
            const sheet = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = sheet.sheetName;
            sheetSelector.appendChild(option);
        });

        // Set the current sheet to the first one and load its transactions
        currentSheetId = sheetSelector.value;
        loadTransactions(uid, currentSheetId);
    });
}

// Create a new sheet
async function createNewSheet(uid, sheetName) {
    if (!sheetName) return; // Don't create if name is empty
    try {
        await addDoc(collection(db, 'sheets'), {
            uid: uid,
            sheetName: sheetName,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating new sheet: ", error);
    }
}

// Event listener for the "New Sheet" button
newSheetBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        const newSheetName = prompt("Enter a name for your new sheet:");
        if (newSheetName) {
            createNewSheet(user.uid, newSheetName);
        }
    }
});

// Event listener for when the user changes the selected sheet
sheetSelector.addEventListener('change', (e) => {
    currentSheetId = e.target.value;
    const user = auth.currentUser;
    if (user) {
        loadTransactions(user.uid, currentSheetId);
    }
});

// --- TRANSACTION MANAGEMENT ---

// MODIFIED: Load transactions for a specific sheet
function loadTransactions(uid, sheetId) {
    if (!sheetId) {
        updateUI([]); // If no sheet is selected, show an empty state
        return;
    }

    const q = query(collection(db, 'transactions'),
        where("uid", "==", uid),
        where("sheetId", "==", sheetId), // Filter by the selected sheet
        orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        let transactions = [];
        snapshot.forEach(doc => {
            transactions.push({ ...doc.data(), id: doc.id });
        });
        updateUI(transactions);
    });
}

// MODIFIED: Add a new transaction to the current sheet
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentSheetId) return alert("Please select a sheet first.");

    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const user = auth.currentUser;

    if (!user || !description || !category || isNaN(amount)) {
        return alert("Please fill all fields correctly.");
    }

    try {
        await addDoc(collection(db, 'transactions'), {
            uid: user.uid,
            sheetId: currentSheetId, // Add the current sheet ID
            description,
            category,
            amount,
            type,
            createdAt: serverTimestamp()
        });
        transactionForm.reset();
    } catch (error) {
        console.error("Error adding transaction: ", error);
    }
});

// Delete a transaction (No changes needed here)
async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
        await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
        console.error("Error deleting transaction: ", error);
    }
}

// Update UI (No changes needed here)
function updateUI(transactions) {
    transactionList.innerHTML = '';
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.classList.add(tx.type);
        const iconName = tx.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle';
        li.innerHTML = `
            <div class="transaction-details">
                <div class="icon"><i data-lucide="${iconName}"></i></div>
                <div class="text-details">
                    <span>${tx.description}</span>
                    <span>${tx.category}</span>
                </div>
            </div>
            <span class="transaction-amount">${tx.type === 'income' ? '+' : '-'}₹${tx.amount.toFixed(2)}</span>
            <button class="delete-btn" data-id="${tx.id}"><i data-lucide="trash-2"></i></button>
        `;
        transactionList.appendChild(li);
        if (tx.type === 'income') { totalIncome += tx.amount; } else { totalExpense += tx.amount; }
    });

    lucide.createIcons();
    totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
    totalExpenseEl.textContent = `₹${totalExpense.toFixed(2)}`;
    balanceEl.textContent = `₹${(totalIncome - totalExpense).toFixed(2)}`;

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = async (e) => {
            const docId = e.currentTarget.getAttribute('data-id');
            if (docId) { await deleteTransaction(docId); }
        };
    });
}