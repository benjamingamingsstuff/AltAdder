const sourceUrlInput = document.getElementById('sourceUrl');
const loadBtn = document.getElementById('loadBtn');
const errorContainer = document.getElementById('errorContainer');
const loadingContainer = document.getElementById('loadingContainer');
const mainPage = document.getElementById('mainPage');
const sourcePage = document.getElementById('sourcePage');
const backBtn = document.getElementById('backBtn');
const shareBtn = document.getElementById('shareBtn');

const TRUSTED_SOURCES = [
    'https://cdn.altstore.io/file/altstore/apps.json',
    'https://community-apps.sidestore.io/sidecommunity.json',
    'https://raw.githubusercontent.com/LiveContainer/LiveContainer/refs/heads/main/apps.json'
];

let currentSourceUrl = '';

loadBtn.addEventListener('click', loadSource);
sourceUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadSource();
});

// Handle trusted source buttons
document.querySelectorAll('.trusted-source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        sourceUrlInput.value = btn.dataset.url;
        loadSource();
    });
});

backBtn.addEventListener('click', () => {
    mainPage.style.display = 'flex';
    sourcePage.style.display = 'none';
    sourceUrlInput.value = '';
});

shareBtn.addEventListener('click', shareSource);

// Load trusted sources on page init
window.addEventListener('load', () => {
    loadTrustedSourcesCards();
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    if (sourceParam) {
        sourceUrlInput.value = decodeURIComponent(sourceParam);
        loadSource();
    }
});

async function loadTrustedSourcesCards() {
    const container = document.getElementById('trustedSourcesCards');
    if (!container) return;

    for (const url of TRUSTED_SOURCES) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();

            const card = document.createElement('button');
            card.className = 'trusted-source-card';
            card.dataset.url = url;
            card.onclick = () => {
                sourceUrlInput.value = url;
                loadSource();
            };

            card.innerHTML = `
                <img src="${data.iconURL || ''}" alt="${data.name}" class="source-card-icon">
                <div class="source-card-info">
                    <div class="source-card-name">${data.name || 'Unknown'}</div>
                    <div class="source-card-subtitle">${data.subtitle || ''}</div>
                </div>
            `;

            container.appendChild(card);
        } catch (err) {
            // Silently fail for trusted sources cards
        }
    }
}

async function loadSource() {
    let url = sourceUrlInput.value.trim();

    if (!url) {
        showError('Please enter a source URL');
        return;
    }

    // Handle shorthand for altstore
    if (url === 'apps.altstore.io' || url === 'altstore.io') {
        url = 'https://cdn.altstore.io/file/altstore/apps.json';
    }

    showLoading();
    errorContainer.style.display = 'none';

    try {
        let response = await fetch(url);
        if (!response.ok) {
            // Try CORS proxy for failed requests
            response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        currentSourceUrl = url;
        displaySource(data, url);
    } catch (err) {
        showError(`Failed to load source: ${err.message}`);
    }
}

function displaySource(data, sourceUrl) {
    loadingContainer.style.display = 'none';
    mainPage.style.display = 'none';
    sourcePage.style.display = 'flex';

    // Header image
    const headerImageEl = document.getElementById('headerImage');
    if (data.headerURL) {
        headerImageEl.innerHTML = `<img src="${data.headerURL}" alt="Header">`;
    } else if (data.iconURL) {
        headerImageEl.innerHTML = `<img src="${data.iconURL}" alt="Header">`;
    } else {
        headerImageEl.style.background = data.tintColor || '#f5f5f5';
    }

    // Source details with checkmark for trusted sources
    const isTrusted = TRUSTED_SOURCES.includes(sourceUrl);
    const sourceName = document.getElementById('sourceName');
    sourceName.textContent = data.name || 'Unknown Source';
    if (isTrusted) {
        const checkmark = document.createElement('span');
        checkmark.className = 'source-checkmark';
        checkmark.textContent = '✓';
        sourceName.appendChild(checkmark);
    }

    document.getElementById('sourceSubtitle').textContent = data.subtitle || '';
    document.getElementById('sourceIcon').src = data.iconURL || '';
    document.getElementById('sourceDescription').textContent = data.description || '';

    // Website link
    const websiteLink = document.getElementById('sourceWebsite');
    if (data.website) {
        websiteLink.href = data.website;
        websiteLink.textContent = data.website;
    } else {
        websiteLink.style.display = 'none';
    }

    // Install buttons
    document.getElementById('altStoreBtn').href = `altstore://source?url=${encodeURIComponent(sourceUrl)}`;
    document.getElementById('sideStoreBtn').href = `sidestore://source?url=${encodeURIComponent(sourceUrl)}`;
    document.getElementById('featherBtn').href = `feather://source/${encodeURIComponent(sourceUrl)}`;

    // Apps list
    displayApps(data.apps || []);
}

function displayApps(apps) {
    const appsList = document.getElementById('appsList');
    appsList.innerHTML = '';

    if (!apps.length) {
        appsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No apps in this source</p>';
        return;
    }

    apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';

        const latestVersion = app.versions?.[0];
        const versionText = latestVersion ? `v${latestVersion.version}` : 'No versions';

        card.innerHTML = `
            <img src="${app.iconURL}" alt="${app.name}" class="app-icon">
            <div class="app-info">
                <div class="app-name">${app.name}</div>
                <div class="app-developer">${app.developerName || 'Unknown Developer'}</div>
                <div class="app-subtitle">${app.subtitle || ''}</div>
                <div class="app-version">${versionText}</div>
            </div>
        `;

        appsList.appendChild(card);
    });
}

function showLoading() {
    mainPage.style.display = 'none';
    sourcePage.style.display = 'none';
    errorContainer.style.display = 'none';
    loadingContainer.style.display = 'block';
}

function showError(message) {
    mainPage.style.display = 'flex';
    sourcePage.style.display = 'none';
    loadingContainer.style.display = 'none';
    errorContainer.style.display = 'block';
    errorContainer.textContent = message;
}

function shareSource() {
    if (!currentSourceUrl) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}?source=${encodeURIComponent(currentSourceUrl)}`;
    
    // Try to use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'AltAdder',
            text: 'Check out this AltSource',
            url: shareUrl
        }).catch(() => {});
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Share link copied to clipboard!');
        }).catch(() => {
            alert('Could not copy link');
        });
    }
}