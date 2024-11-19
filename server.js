const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/search', async (req, res) => {
    const keyword = req.body.keyword;
    const city = req.body.city;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const cityToLowerCase = city.trim().toLowerCase();
    console.log(cityToLowerCase)
    

    // Abre o navegador com o Puppeteer
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    // Acesse o site desejado e realiza a busca
    await page.goto('https://www.diariomunicipal.com.br/femurn/pesquisar');

    if(cityToLowerCase === "todos") {
        await page.evaluate((name) => {
            const options = Array.from(document.querySelectorAll('select#busca_avancada_entidadeUsuaria option'));
    
        for (i=0; i <= options.length; i++){
         console.log(options[i]); 
         }
           
        })
    }

    //INICIA AQUI
    const cityValue = await page.evaluate((name) => {
        const normalizedName = name.trim().toLowerCase(); // Remove espaços e coloca tudo em minúsculas
        const options = Array.from(document.querySelectorAll('select#busca_avancada_entidadeUsuaria option')); //cria um array com todos os valores de "option" no elemento "select" com id busca_avancada_entidadeUsuaria
    
        const option = options.find(opt => {
            const optionText = opt.textContent.trim().toLowerCase(); // remove espaços e coloca tudo em minúsculo
            return optionText.includes(normalizedName); // Verifica se a opção contém o nome buscado
        });
        
        return option ? option.value : null;
        
    }, city);
    


    //Se encontrar a cidade, deverá selecionar ela no navegador usando o value
    if (cityValue) {
        await page.select('select#busca_avancada_entidadeUsuaria', cityValue);
    } else {
        console.log('Município não encontrado');
        await browser.close();
        res.status(404).send('Município não encontrado');
        return;
    }

    //função para deixar a data no formato dd/mm/aaaa:

    function formatDateToDDMMYYY (dateString) {
        const [year, month, day] = dateString.split ('-');
        return `${day}/${month}/${year}`
    }

    //inserir a data de início:
    await page.click('#busca_avancada_dataInicio','#busca_avancada_dataFim'); // Clica no campo para ativá-lo
    await page.focus('#busca_avancada_dataInicio','#busca_avancada_dataFim'); // Garante o foco no campo
    await page.keyboard.down('Control');
    await page.keyboard.press('A'); // Seleciona todo o texto atual
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace'); // Limpa o campo
    await page.type('#busca_avancada_dataInicio', formatDateToDDMMYYY(startDate)); // Digita o novo valor
    await page.type('#busca_avancada_dataFim', formatDateToDDMMYYY(endDate));
    

     //inserir a data fun:
     await page.click('#busca_avancada_dataFim'); // Clica no campo para ativá-lo
     await page.focus('#busca_avancada_dataFim'); // Garante o foco no campo
     await page.keyboard.down('Control');
     await page.keyboard.press('A'); // Seleciona todo o texto atual
     await page.keyboard.up('Control');
     await page.keyboard.press('Backspace'); // Limpa o campo
     await page.type('#busca_avancada_dataFim', formatDateToDDMMYYY(endDate));
      
    
    
    //Insere a palavra-chave e clica em pesquisar
    await page.type('#busca_avancada_texto', keyword);
    await page.click('#busca_avancada_Enviar');
    await page.waitForNavigation();

    //ATÉ AQUI
  
    
    //Gera o PDF da página de resultados
    // const pdfBuffer = await page.pdf();

    // await browser.close();

    // // Envia o PDF de volta ao usuário
    // res.set({
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': 'attachment; filename=resultados.pdf',
    //     'Content-Length': pdfBuffer.length,
    // });
    // res.send(pdfBuffer);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});