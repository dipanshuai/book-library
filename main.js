// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortBySelect = document.getElementById('sortBy');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const loader = document.getElementById('loader');
const noResults = document.getElementById('noResults');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageNumbers = document.getElementById('pageNumbers');
const paginationInfo = document.getElementById('paginationInfo');

// State variables
let books = [];
let currentPage = 1;
let isGrid = true;
let totalPages = 1;
let currentSearchTerm = '';
let currentViewClass = 'books-grid';
let searchTimeout = null;
const MIN_SEARCH_LENGTH = 3;

// API URL
const API_URL = 'https://api.freeapi.app/api/v1/public/books';

// Initialize the application
async function init() {
    loadUserPreferences();
    
    applyViewMode();
    
    await fetchBooksAndDisplay();
    
    setupEventListeners();
}

// Load user preferences from localStorage
function loadUserPreferences() {
    const savedViewMode = localStorage.getItem('bookLibrary_viewMode');
    if (savedViewMode) {
        currentViewClass = savedViewMode;
        isGrid = savedViewMode === 'books-grid';
    }
    
    const savedPage = localStorage.getItem('bookLibrary_page');
    if (savedPage) {
        currentPage = parseInt(savedPage);
    }
    
    const savedSearch = localStorage.getItem('bookLibrary_search');
    if (savedSearch) {
        currentSearchTerm = savedSearch;
        searchInput.value = savedSearch;
        toggleClearSearchButton();
    }
    
    const savedSort = localStorage.getItem('bookLibrary_sort');
    if (savedSort) {
        sortBySelect.value = savedSort;
    }
}

// Apply the current view mode (grid or list)
function applyViewMode() {
    booksContainer.className = currentViewClass;
    
    if (isGrid) {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    } else {
        gridViewBtn.classList.remove('active');
        listViewBtn.classList.add('active');
    }
}

function saveUserPreferences() {
    localStorage.setItem('bookLibrary_viewMode', currentViewClass);
    localStorage.setItem('bookLibrary_page', currentPage.toString());
    localStorage.setItem('bookLibrary_search', currentSearchTerm);
    localStorage.setItem('bookLibrary_sort', sortBySelect.value);
}

// Fetch books from API
async function fetchBooks(page = 1, query = '') {
    showLoader();
    
    try {
        let url = `${API_URL}?page=${page}&limit=9`; 
        
        if (query) {
            url += `&query=${encodeURIComponent(query)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to fetch books');
        }
        
        const apiData = data.data;
        totalPages = apiData.totalPages || 1;
        const hasNextPage = apiData.nextPage || false;
        
        updatePagination(page, totalPages, hasNextPage);
        
        return apiData.data || [];
        
    } catch (error) {
        console.error('Error fetching books:', error);
        return [];
    } finally {
        hideLoader();
    }
}

// Fetch books and display them
async function fetchBooksAndDisplay() {
    const newBooks = await fetchBooks(currentPage, currentSearchTerm);
    
    if (newBooks.length > 0) {
        books = newBooks;
        displayBooks();
    } else {
        booksContainer.innerHTML = '';
        noResults.classList.remove('hidden');
    }
}

// Display the books
function displayBooks() {
    noResults.classList.add('hidden');
    
    booksContainer.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        
        bookCard.className = isGrid ? 'book-card' : 'book-card list-view';
        
        const bookInfo = book.volumeInfo || {};
        const title = bookInfo.title || 'Unknown Title';
        const subtitle = bookInfo.subtitle || '';
        const authors = bookInfo.authors ? bookInfo.authors.join(', ') : 'Unknown Author';
        const publisher = bookInfo.publisher || 'Unknown Publisher';
        const publishedDate = bookInfo.publishedDate || 'Unknown Date';
        
        let thumbnailUrl = 'https://via.placeholder.com/150x200?text=No+Cover';
        if (bookInfo.imageLinks) {
            thumbnailUrl = bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail || thumbnailUrl;
            thumbnailUrl = thumbnailUrl.replace('http:', 'https:');
        }
        
        if (isGrid) {
            bookCard.innerHTML = `
                <div class="book-img">
                    <img src="${thumbnailUrl}" alt="${title}" loading="lazy">
                </div>
                <div class="book-info">
                    <h3 class="book-title" title="${title}">${title}</h3>
                    <p class="book-author">By: ${authors}</p>
                    <p class="book-publisher">Publisher: ${publisher}</p>
                    <p class="book-published">Published: ${publishedDate}</p>
                    <a href="${bookInfo.infoLink || '#'}" target="_blank" class="book-details-btn">More Details</a>
                </div>
            `;
        } else {
            bookCard.innerHTML = `
                <div class="book-img">
                    <img src="${thumbnailUrl}" alt="${title}" loading="lazy">
                </div>
                <div class="book-info">
                    <div class="book-header">
                        <h3 class="book-title" title="${title}">${title}</h3>
                        <p class="book-author">By: ${authors}</p>
                    </div>
                    <div class="book-meta">
                        <p class="book-publisher">Publisher: ${publisher}</p>
                        <p class="book-published">Published: ${publishedDate}</p>
                    </div>
                    <a href="${bookInfo.infoLink || '#'}" target="_blank" class="book-details-btn">More Details</a>
                </div>
            `;
        }
        
        // Make the card clickable (opens more details link)
        bookCard.addEventListener('click', function(e) {
            if (!e.target.closest('a')) {
                window.open(bookInfo.infoLink || '#', '_blank');
            }
        });
        
        bookCard.style.cursor = 'pointer';
        
        booksContainer.appendChild(bookCard);
    });
    
    saveUserPreferences();
}

// Set up event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounceSearch);
    
    clearSearchBtn.addEventListener('click', clearSearch);
    
    sortBySelect.addEventListener('change', handleSort);
    
    gridViewBtn.addEventListener('click', function() {
        toggleView(true);
    });
    
    listViewBtn.addEventListener('click', function() {
        toggleView(false);
    });
    
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });
}

// Debounce search to avoid too many API calls
function debounceSearch() {
    toggleClearSearchButton();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length >= MIN_SEARCH_LENGTH || searchTerm === '') {
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 1000); 
    }
}

// Toggle clear search button visibility
function toggleClearSearchButton() {
    if (searchInput.value.trim() === '') {
        clearSearchBtn.classList.add('hidden');
    } else {
        clearSearchBtn.classList.remove('hidden');
    }
}

// Clear search
function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    
    if (currentSearchTerm !== '') {
        currentSearchTerm = '';
        currentPage = 1;
        fetchBooksAndDisplay();
    }
}

// Handle search
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm !== currentSearchTerm) {
        currentSearchTerm = searchTerm;
        currentPage = 1;
        fetchBooksAndDisplay();
    }
}

// Handle sort
function handleSort() {
    const sortOption = sortBySelect.value;
    
    switch (sortOption) {
        case 'title':
            // Sort by title A-Z
            books.sort((a, b) => {
                const titleA = a.volumeInfo?.title?.toLowerCase() || '';
                const titleB = b.volumeInfo?.title?.toLowerCase() || '';
                return titleA.localeCompare(titleB);
            });
            break;
        case 'title-desc':
            // Sort by title Z-A
            books.sort((a, b) => {
                const titleA = a.volumeInfo?.title?.toLowerCase() || '';
                const titleB = b.volumeInfo?.title?.toLowerCase() || '';
                return titleB.localeCompare(titleA);
            });
            break;
        case 'date':
            // Sort by date newest first
            books.sort((a, b) => {
                const dateA = a.volumeInfo?.publishedDate || '';
                const dateB = b.volumeInfo?.publishedDate || '';
                return dateB.localeCompare(dateA);
            });
            break;
        case 'date-asc':
            // Sort by date oldest first
            books.sort((a, b) => {
                const dateA = a.volumeInfo?.publishedDate || '';
                const dateB = b.volumeInfo?.publishedDate || '';
                return dateA.localeCompare(dateB);
            });
            break;
    }
    
    displayBooks();
}

// Toggle view between grid and list
function toggleView(grid) {
    isGrid = grid;
    currentViewClass = isGrid ? 'books-grid' : 'books-list';
    applyViewMode();
    displayBooks();
}

// Go to a specific page
async function goToPage(page) {
    currentPage = page;
        await fetchBooksAndDisplay();
        booksContainer.scrollIntoView({ behavior: 'smooth' });
}

// Update pagination controls
function updatePagination(currentPage, totalPages, hasNextPage) {
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = !hasNextPage || currentPage >= totalPages;
    generatePageNumbers(currentPage, totalPages);
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Generate page number buttons
function generatePageNumbers(currentPage, totalPages) {
    pageNumbers.innerHTML = '';
    const maxButtons = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons && startPage > 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        addPageButton(1);
        
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        
        addPageButton(totalPages);
    }
}

// Add a page number button
function addPageButton(pageNum) {
    const button = document.createElement('button');
    button.className = `pagination-button ${pageNum === currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    button.addEventListener('click', function() {
        goToPage(pageNum);
    });
    pageNumbers.appendChild(button);
}

// Add ellipsis between page numbers
function addEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'pagination-ellipsis';
    ellipsis.textContent = '...';
    pageNumbers.appendChild(ellipsis);
}

// Show the loader
function showLoader() {
    loader.classList.remove('hidden');
}

// Hide the loader
function hideLoader() {
    loader.classList.add('hidden');
}

// Run the initialization when the page loads
document.addEventListener('DOMContentLoaded', init);