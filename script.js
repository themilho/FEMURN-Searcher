document.querySelector('#search-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const formData = new FormData (event.target);
    const searchParams = new URLSearchParams(formData);

    try {
        const response = await fetch('/search', {
            method: 'POST',
            body: searchParams, // O 'body' aqui deve conter os dados formatados corretamente
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // Definir o cabeçalho para enviar como URL encoded
            }
        });
        const results = await response.json(); 
        renderResults(results);
    } catch (error) {
        console.error('Erro ao buscar dados', error);
    }    
})

function renderResults(data) {
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = '';

    if (data.length === 0) {
        resultsGrid.innerHTML = '<p>Nenhum resultado encontrado.</p>';
        return;
    }

    data.forEach(({municipio, title, date, links}) => {
        const card = `
            <div class="col-md-4 mb-3"> 
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${municipio}</h5>
                        <p class="card-text"><strong>Título: </strong>${title}</p>
                        <p class="card-text"><strong>Data: </strong>${date}</p> 
                        <a href="${links}" class="btn btn-primary btn-sm" target="_blank">Abrir</a>
                    </div> 
                </div>
            </div>`;
        resultsGrid.insertAdjacentHTML('beforeend', card);      
    });
}