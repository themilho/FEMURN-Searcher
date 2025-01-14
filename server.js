const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda')
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/script.js',(req, res) => {
    res.sendFile(__dirname + '/script.js')
})

app.get('/style.css', (req,res) => {
    res.sendFile(__dirname + '/style.css')
})

app.post('/search', async (req, res) => {
    const keyword = req.body.keyword;
    const city = req.body.city;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const cityHall = 'Prefeitura Municipal de ';
    const cityToLowerCase = cityHall + (city.trim().toLowerCase());  

    // Abre o navegador com o Puppeteer (chrome-aws-lambda)
    let browser;
    try {
        // const browser = await puppeteer.launch({headless: false});
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ],
            executablePath: await chromium.executablePath,
            headless:chromium.headless,
        });
        const page = await browser.newPage();

        // Acesse o site desejado e realiza a busca
        await page.goto('https://www.diariomunicipal.com.br/femurn/pesquisar');

    

        //INICIA AQUI
        const cityValue = await page.evaluate((name) => {
            const normalizedName = name.trim().toLowerCase(); // Remove espaços e coloca tudo em minúsculas
            const options = Array.from(document.querySelectorAll('select#busca_avancada_entidadeUsuaria option')); //cria um array com todos os valores de "option" no elemento "select" com id busca_avancada_entidadeUsuaria
    
            const option = options.find(opt => {
                const optionText = opt.textContent.trim().toLowerCase(); // remove espaços e coloca tudo em minúsculo
                return optionText.includes(normalizedName); // Verifica se a opção contém o nome buscado
            });
        
            return option ? option.value : null;
        
        }, cityToLowerCase);
    


        //Se encontrar a cidade, deverá selecionar ela no navegador usando o value
        if (cityValue) {
            await page.select('select#busca_avancada_entidadeUsuaria', cityValue);
        } else {
            res.status(404).send('Município não encontrado');
            return;
        }

        //Insere a palavra-chave 
        await page.type('#busca_avancada_texto', keyword);


        //função para deixar a data no formato dd/mm/aaaa:
        function formatDateToDDMMYYYY (dateString) {
            const [year, month, day] = dateString.split ('-');
            return `${day}/${month}/${year}`
        }


        // Função para limpar e preencher campos
        async function clean(selector, date) {
        
            await page.click(selector); // Clica no campo para ativá-lo
            await page.focus(selector); // Garante o foco no campo
            await page.keyboard.down('Control'); // Segura a tecla Control
            await page.keyboard.press('A'); // Seleciona todo o texto
            await page.keyboard.up('Control'); // Solta a tecla Control
            await page.keyboard.press('Backspace'); // Apaga o conteúdo do campo
            await page.type(selector, date); // Insere a nova data
        }

        // Inserir as datas
        await clean('#busca_avancada_dataInicio', formatDateToDDMMYYYY(startDate));
        await clean('#busca_avancada_dataFim', formatDateToDDMMYYYY(endDate));
    

        //Clica em pesquisar
        await page.click('#busca_avancada_Enviar');   
        await page.waitForSelector('tbody tr td a', {visible:true});


        // Encontrar o link da pesquisa feita    
        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('tbody tr');
            const results = [];
            console.log(rows)

            rows.forEach(row => {
                // Nome do município e título (primeira e segunda coluna)
                // console.log(row.outerHTML) //Mostra o HTML completo da linha que foi capturada
                const municipio = row.querySelector('td:first-child a')?.textContent.trim() || 'Não identificado';
                const title = row.querySelector('td:nth-child(2) a')?.textContent.trim() || 'Não identificado';
                const date = row.querySelector('td:nth-child(4) a')?.textContent.trim() || 'Não identificado';

                //Link que contém no "município"
                const links = row.querySelector('td:nth-child(2) a')?.href || 'Não encontrado';
            
                if (links !== 'Não encontrado') {
                    results.push({ municipio, title, date, links });
                }            
            });
    
            return results;
        });
        
   
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally{
        if (browser) await browser.close();
    }   
});

// Exporte o app para o Vercel
module.exports = app;

const PORT = 4000;
app.listen (PORT, () => {
    console.log(`Server is running at http:localhost:${PORT}`)
});