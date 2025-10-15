import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCLFF_G7J0jcZ5UOXkKaaI4dzYWGQYwfMk",
    authDomain: "share-link-app-7c054.firebaseapp.com",
    projectId: "share-link-app-7c054",
    storageBucket: "share-link-app-7c054.appspot.com",
    messagingSenderId: "798642318617",
    appId: "1:798642318617:web:fb6a11384f56a93d6ae988"
};
const ALLOWED_USERS = ['qcda.app@gmail.com', 'akihumikoiwa1162@gmail.com'];
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxK1vKRm9D-oWlkOkmLsrEeNf9vse6R6qmQpE_TJpsTWZjHepBX6yheNQ3t-CMGT4sG/exec";
const DOC_ID_FOR_LIST = '1GFx3yl_M6ljmZhgBTS5PGhOtYpe_Umwl9myEfLNHMyo';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- UI Helpers ---
const showLoading = () => {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
};
const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
};
const showMessage = (elementId, message, type) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'message';
    el.classList.add(type);
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
};

// --- API Call Helper ---
const callGasApi = async (action, payload = {}) => {
    showLoading();
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8', }, // Use text/plain for GAS POST
            body: JSON.stringify({ action, payload })
        });
        // Since GAS web apps can do redirects on POST, we need to handle the response carefully.
        const textResponse = await response.text();
        const result = JSON.parse(textResponse);

        if (result.status === 'error') throw new Error(result.message);
        return result.data;
    } finally {
        hideLoading();
    }
};

// --- Authentication ---
export const authGuard = (pageType) => {
    onAuthStateChanged(auth, user => {
        const isAllowed = user && ALLOWED_USERS.includes(user.email);
        if (pageType === 'private' && !isAllowed) {
            window.location.replace('login.html');
        }
        if (pageType === 'public' && isAllowed) {
            window.location.replace('list.html');
        }
    });
};
export const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
export const handleLogout = () => signOut(auth);

// --- Common UI Initialization ---
export const initCommonUI = () => {
    const container = document.getElementById('common-ui-container');
    if (!container) return;
    container.innerHTML = `
        <div id="hamburger-icon">
            <div class="bar1"></div><div class="bar2"></div><div class="bar3"></div>
        </div>
        <div id="sideMenu" class="sidenav">
            <a href="list.html">企業情報一覧</a>
            <a href="guide.html">使い方ガイド</a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLScGBvXYBi2eNcP7SYKieTLoOYJFnyZ9R5FjCGFhGwfvV2oQqA/viewform?usp=dialog" target="_blank" rel="noopener noreferrer">お問い合わせ</a>
            <a href="https://www.notion.so/21de20387ddf8076a938fa17c25257f4" target="_blank" rel="noopener noreferrer">リリースノート</a>
            <a href="https://qcda-dev.github.io/HP/" target="_blank" rel="noopener noreferrer">QcDa Projectとは</a>
            <div class="version-info">ver 3.0.0</div>
        </div>
        <div id="menuOverlay"></div>
    `;
    const toggleMenu = () => {
        document.getElementById('hamburger-icon').classList.toggle("change");
        const sideMenu = document.getElementById('sideMenu');
        const isOpen = sideMenu.style.width === "250px";
        sideMenu.style.width = isOpen ? "0" : "250px";
        document.getElementById('menuOverlay').style.display = isOpen ? "none" : "block";
    };
    document.getElementById('hamburger-icon').addEventListener('click', toggleMenu);
    document.getElementById('menuOverlay').addEventListener('click', toggleMenu);
};

// --- List View Logic ---
export const fetchAndRenderList = async () => {
    const docContentDiv = document.getElementById('documentContent');
    if (!docContentDiv) return;
    docContentDiv.innerHTML = '<p class="text-gray-500">ドキュメントを読み込み中...</p>';
    try {
        const contentElements = await callGasApi('getGoogleDocContent', { docId: DOC_ID_FOR_LIST });
        renderDocumentContent(docContentDiv, contentElements, true);
    } catch (error) {
        showMessage('list-message', `一覧の読み込みに失敗しました: ${error.message}`, 'error');
    }
};

const renderDocumentContent = (container, contentElements, isMainList) => {
    container.innerHTML = '';
    contentElements.forEach(element => {
        if (element.paragraph) {
            const p = document.createElement('p');
            element.paragraph.elements.forEach(run => {
                if (run.textRun) {
                    let textNode;
                    const textStyle = run.textRun.textStyle;
                    if (textStyle && textStyle.link) {
                        textNode = document.createElement('a');
                        textNode.href = textStyle.link.url;
                        textNode.className = 'text-blue-600 hover:underline';
                        if (!isMainList) {
                            textNode.target = '_blank';
                            textNode.rel = 'noopener noreferrer';
                        }
                    } else {
                        textNode = document.createElement('span');
                    }
                    textNode.textContent = run.textRun.content;
                    if (textStyle) {
                        if (textStyle.bold) textNode.style.fontWeight = 'bold';
                        if (textStyle.italic) textNode.style.fontStyle = 'italic';
                        if (textStyle.underline) textNode.style.textDecoration = 'underline';
                    }
                    p.appendChild(textNode);
                }
            });
            container.appendChild(p);
        }
    });
};

export const handleDocLinkClick = async (event) => {
    event.preventDefault();
    const url = event.target.href;
    const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        const linkedDocId = match[1];
        try {
            const content = await callGasApi('getGoogleDocContent', { docId: linkedDocId });
            renderDocumentContent(document.getElementById('popupBody'), content, false);
            document.getElementById('popupOverlay').style.display = 'flex';
        } catch (error) {
            showMessage('list-message', `リンク先の読み込みに失敗: ${error.message}`, 'error');
        }
    } else {
        window.open(url, '_blank');
    }
};

// --- Entry View Logic ---
const populateDropdown = (selectElement, options) => {
    selectElement.innerHTML = '<option value="">----</option>';
    if (options && Array.isArray(options)) {
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            selectElement.appendChild(opt);
        });
    }
};

export const setupEntryForm = async () => {
    try {
        const { tags, newTags } = await callGasApi('getTagsForEntry');
        populateDropdown(document.getElementById('industrySelect'), tags);
        populateDropdown(document.getElementById('newIndustrySelect'), newTags);

        document.getElementById('industrySelect').addEventListener('change', async (e) => {
            const industryName = e.target.value;
            const companySelect = document.getElementById('companySelect');
            if (!industryName) {
                populateDropdown(companySelect, []);
                return;
            }
            try {
                const companies = await callGasApi('getCompaniesByIndustry', { industryName });
                populateDropdown(companySelect, companies);
            } catch (error) {
                 showMessage('entry-message', `企業リストの取得に失敗: ${error.message}`, 'error');
            }
        });
    } catch (error) {
        showMessage('entry-message', `業界リストの取得に失敗: ${error.message}`, 'error');
    }
};

export const handleEntrySubmit = async () => {
    const form = document.getElementById('recordForm');
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return showMessage('entry-message', '認証情報がありません。再度ログインしてください。', 'error');
    }
    const formData = {
        industryName: form.industryName.value,
        companyName: form.companyName.value,
        newIndustryName: form.newIndustryName.value,
        newCompanyName: form.newCompanyName.value.trim(),
        title: form.title.value.trim(),
        contents: form.contents.value.trim(),
        userId: currentUser.email,
    };

    if (!formData.title) {
        return showMessage('entry-message', 'タイトルは必須です。', 'error');
    }
    if (!formData.companyName && !formData.newCompanyName) {
        return showMessage('entry-message', '既存の企業か新しい企業を選択・入力してください。', 'error');
    }
    
    try {
        const response = await callGasApi('addRecord', formData);
        showMessage('entry-message', response.message, 'success');
        form.reset();
        populateDropdown(document.getElementById('companySelect'), []);
    } catch (error) {
        showMessage('entry-message', `登録エラー: ${error.message}`, 'error');
    }
};
