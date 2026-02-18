let currentProducts = [];
let currentPage = 1;
let isSearchMode = false;

window.onload = () => fetchCatalog(1);

// --- API FETCHING ---

async function fetchCatalog(page) {
    showLoading(true);
    try {
        const res = await fetch(`http://localhost:3000/api/catalog?page=${page}&size=9`);
        const data = await res.json();
        if (!res.ok) throw new Error("Failed to load catalog");

        currentProducts = data; // Save for detail view
        renderGrid(data);
        updatePaginationUI(page, false);
    } catch (err) {
        showError(err.message);
    } finally {
        showLoading(false);
    }
}

async function handleSearch() {
    const input = document.getElementById('searchInput').value.trim();
    if (!input) return alert("Enter a part number");

    isSearchMode = true;
    showLoading(true);
    try {
        const res = await fetch(`http://localhost:3000/api/search?number=${input}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");

        currentProducts = data; // Save for detail view
        renderGrid(data);
        updatePaginationUI(1, true);
    } catch (err) {
        showError(err.message);
        document.getElementById('productGrid').innerHTML = "";
    } finally {
        showLoading(false);
    }
}

function resetCatalog() {
    document.getElementById('searchInput').value = "";
    isSearchMode = false;
    currentPage = 1;
    goBack(); 
    fetchCatalog(currentPage);
}

// --- VIEW NAVIGATION ---

function showProductDetail(index) {
    const p = currentProducts[index];
    if (!p) return;

    // 1. Hide Grid, Show Detail
    document.getElementById('catalogView').style.display = 'none';
    document.getElementById('detailView').style.display = 'block';
    window.scrollTo(0, 0);

    // 2. Populate Basic Info
    const name = getLocalizedText(p.BnrShortText, "Unknown Product");
    const desc = getLocalizedText(p.Description, "No description available.");
    
    document.getElementById('detailTitle').innerText = name;
    document.getElementById('detailNum').innerText = p.IamNumber || p.Id;
    document.getElementById('detailDesc').innerText = desc;

    // 3. Image
    const imgElement = document.getElementById('detailImage');
    if (p.Image && p.Image.ResourceId) {
        imgElement.src = `http://localhost:3000/api/image/${p.Image.ResourceId}`;
    } else {
        imgElement.src = "https://placehold.co/400x300?text=No+Image";
    }

    // 4. Populate Features
    const featureDiv = document.getElementById('detailFeatures');
    featureDiv.innerHTML = "";
    const features = p.Features?.find(x => x.Language === 'en')?.Texts || [];
    if(features.length > 0) {
        featureDiv.innerHTML = "<h4>Features:</h4><ul>" + features.map(f => `<li>${f}</li>`).join('') + "</ul>";
    }

    // 5. Populate Specs Table
    const table = document.getElementById('specsTable');
    table.innerHTML = "";
    if (p.Properties && p.Properties.length > 0) {
        p.Properties.forEach(prop => {
            const row = table.insertRow();
            row.insertCell(0).innerText = prop.Name;
            
            // Handle values that might have units
            let valStr = "N/A";
            if(prop.Value && prop.Value.Value !== undefined) {
                valStr = `${prop.Value.Value} ${prop.Value.Unit || ''}`;
            } else if (prop.Value && prop.Value.Value) {
                valStr = prop.Value.Value; // Text value
            }
            row.insertCell(1).innerText = valStr;
        });
    } else {
        table.innerHTML = "<tr><td>No technical properties available.</td></tr>";
    }
}

function goBack() {
    document.getElementById('detailView').style.display = 'none';
    document.getElementById('catalogView').style.display = 'block';
}

// --- RENDERING HELPERS ---

function renderGrid(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = "";
    document.getElementById('errorMsg').innerText = "";

    if (!products || products.length === 0) {
        showError("No products found.");
        return;
    }

    products.forEach((p, index) => {
        const name = getLocalizedText(p.BnrShortText, "Unknown Product");
        const shortDesc = getLocalizedText(p.MaterialShortText, "");
        const imgUrl = p.Image?.ResourceId ? `http://localhost:3000/api/image/${p.Image.ResourceId}` : 'https://placehold.co/300x200?text=No+Image';

        const card = document.createElement('div');
        card.className = 'card';
        // Pass the INDEX to the click handler
        card.onclick = () => showProductDetail(index);
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${name}" loading="lazy" />
            <h3>${name}</h3>
            <div class="sub">${p.IamNumber || p.Id}</div>
            <div style="font-size:0.9rem; color:#555;">${shortDesc}</div>
            <div class="btn-text">View Details →</div>
        `;
        grid.appendChild(card);
    });
}

// Helper to find English text or default to first available
function getLocalizedText(array, defaultText) {
    if (!array || !Array.isArray(array) || array.length === 0) return defaultText;
    return array.find(x => x.Language === 'en')?.Text || array[0]?.Text || defaultText;
}

function updatePaginationUI(page, isSearch) {
    const pagDiv = document.getElementById('pagination');
    if (isSearch) {
        pagDiv.style.display = 'none';
    } else {
        pagDiv.style.display = 'flex';
        document.getElementById('pageIndicator').innerText = `Page ${page}`;
        document.getElementById('prevBtn').disabled = (page === 1);
    }
}

function changePage(delta) {
    if (isSearchMode) return;
    const newPage = currentPage + delta;
    if (newPage < 1) return;
    currentPage = newPage;
    fetchCatalog(currentPage);
}

function showLoading(isLoading) {
    document.getElementById('loader').style.display = isLoading ? 'block' : 'none';
    if(isLoading) {
        document.getElementById('productGrid').innerHTML = "";
        document.getElementById('errorMsg').innerText = "";
    }
}

function showError(msg) {
    document.getElementById('errorMsg').innerText = msg;
}