// Verificar se é mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Menu mobile
document.getElementById('mobileMenuBtn')?.addEventListener('click', function() {
    const nav = document.getElementById('mainNav');
    nav.classList.toggle('nav-active');
});

// Instalação PWA
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar prompt após 5 segundos
    setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            installPrompt.style.display = 'flex';
        }
    }, 5000);
});

installButton?.addEventListener('click', async () => {
    installPrompt.style.display = 'none';
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário ${outcome} a instalação`);
        deferredPrompt = null;
    }
});

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Falha ao registrar Service Worker:', error);
            });
    });
}

// Cálculos da rescisão
document.addEventListener('DOMContentLoaded', function() {
    // Set default dates
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    document.getElementById('admissionDate').valueAsDate = oneYearAgo;
    document.getElementById('dismissalDate').valueAsDate = today;
    
    // Calculate button event
    document.getElementById('calculateBtn')?.addEventListener('click', calculateSeverance);
    
    // Export PDF button
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
    
    // Share button
    document.getElementById('shareBtn')?.addEventListener('click', shareResults);
});

function calculateSeverance() {
    // Get input values
    const admissionDate = new Date(document.getElementById('admissionDate').value);
    const dismissalDate = new Date(document.getElementById('dismissalDate').value);
    const salary = parseFloat(document.getElementById('salary').value);
    const noticePeriod = document.getElementById('noticePeriod').value;
    const dismissalType = document.querySelector('input[name="dismissalType"]:checked').value;
    const vacationBalance = parseInt(document.getElementById('vacationBalance').value) || 0;
    const fgtsOptOut = document.getElementById('fgtsOptOut')?.checked || false;
    
    // Validate inputs
    if (!admissionDate || !dismissalDate || isNaN(salary) || salary <= 0) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }
    
    if (dismissalDate <= admissionDate) {
        alert("A data de demissão deve ser posterior à data de admissão.");
        return;
    }
    
    // Calculate working time
    const monthsWorked = calculateMonthsBetween(admissionDate, dismissalDate);
    const daysWorkedInMonth = dismissalDate.getDate();
    
    // Calculate salary per day
    const salaryPerDay = salary / 30;
    
    // 1. Salary balance
    const salaryBalance = (daysWorkedInMonth * salaryPerDay).toFixed(2);
    
    // 2. Vacation due
    const vacationDueValue = ((vacationBalance / 30) * salary).toFixed(2);
    
    // 3. Proportional vacation
    const proportionalMonths = monthsWorked % 12;
    const vacationProportionalValue = ((proportionalMonths / 12) * salary).toFixed(2);
    
    // 4. One third of vacation
    const totalVacation = parseFloat(vacationDueValue) + parseFloat(vacationProportionalValue);
    const oneThirdValue = (totalVacation / 3).toFixed(2);
    
    // 5. Proportional 13th salary
    const thirteenthSalaryValue = ((proportionalMonths / 12) * salary).toFixed(2);
    
    // 6. Notice period
    let noticePeriodValue = 0;
    if (dismissalType !== 'withCause') {
        if (noticePeriod === 'paid' || noticePeriod === 'dispensed') {
            noticePeriodValue = salary;
        }
    }
    
    // 7. FGTS calculations
    const estimatedFGTSBalance = (salary * 0.08 * monthsWorked).toFixed(2);
    let fgtsFineValue = 0;
    
    if (dismissalType === 'withoutCause') {
        fgtsFineValue = (estimatedFGTSBalance * 0.4).toFixed(2);
    } else if (dismissalType === 'resignation' && !fgtsOptOut) {
        fgtsFineValue = (estimatedFGTSBalance * 0.2).toFixed(2);
    }
    
    // Calculate total
    const totalAmount = (
        parseFloat(salaryBalance) +
        parseFloat(vacationDueValue) +
        parseFloat(vacationProportionalValue) +
        parseFloat(oneThirdValue) +
        parseFloat(thirteenthSalaryValue) +
        parseFloat(noticePeriodValue) +
        parseFloat(fgtsFineValue)
    ).toFixed(2);
    
    // Display results
    document.getElementById('resultItems').classList.remove('hidden');
    document.querySelector('.initial-message').style.display = 'none';
    
    document.getElementById('salaryBalance').textContent = formatCurrency(salaryBalance);
    document.getElementById('vacationDue').textContent = formatCurrency(vacationDueValue);
    document.getElementById('vacationProportional').textContent = formatCurrency(vacationProportionalValue);
    document.getElementById('oneThird').textContent = formatCurrency(oneThirdValue);
    document.getElementById('thirteenthSalary').textContent = formatCurrency(thirteenthSalaryValue);
    document.getElementById('noticePeriodValue').textContent = formatCurrency(noticePeriodValue);
    document.getElementById('fgtsFine').textContent = formatCurrency(fgtsFineValue);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    
    // Scroll to results on mobile
    if (isMobile) {
        document.getElementById('resultItems').scrollIntoView({ behavior: 'smooth' });
    }
}

function calculateMonthsBetween(startDate, endDate) {
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    months -= startDate.getMonth();
    months += endDate.getMonth();
    
    if (endDate.getDate() < startDate.getDate()) {
        months--;
    }
    
    return months <= 0 ? 0 : months;
}

function formatCurrency(value) {
    return 'R$ ' + parseFloat(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Comprovante de Cálculo de Rescisão', 105, 15, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`Data do cálculo: ${new Date().toLocaleDateString('pt-BR')}`, 105, 25, { align: 'center' });
    
    // Get values
    const salaryBalance = document.getElementById('salaryBalance').textContent;
    const vacationDue = document.getElementById('vacationDue').textContent;
    const vacationProportional = document.getElementById('vacationProportional').textContent;
    const oneThird = document.getElementById('oneThird').textContent;
    const thirteenthSalary = document.getElementById('thirteenthSalary').textContent;
    const noticePeriodValue = document.getElementById('noticePeriodValue').textContent;
    const fgtsFine = document.getElementById('fgtsFine').textContent;
    const totalAmount = document.getElementById('totalAmount').textContent;
    
    // Add results to PDF
    let yPosition = 40;
    
    doc.setFontSize(14);
    doc.text('RESULTADO DO CÁLCULO:', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.text(`Saldo de Salário: ${salaryBalance}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Férias Vencidas: ${vacationDue}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Férias Proporcionais: ${vacationProportional}`, 20, yPosition);
    yPosition += 8;
    doc.text(`1/3 Constitucional: ${oneThird}`, 20, yPosition);
    yPosition += 8;
    doc.text(`13º Salário Proporcional: ${thirteenthSalary}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Aviso Prévio: ${noticePeriodValue}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Multa do FGTS: ${fgtsFine}`, 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(16);
    doc.text(`TOTAL A RECEBER: ${totalAmount}`, 20, yPosition);
    yPosition += 15;
    
    // Disclaimer
    doc.setFontSize(10);
    doc.text('Este é um cálculo estimativo para fins informativos.', 20, yPosition);
    yPosition += 5;
    doc.text('Consulte um contador ou advogado trabalhista para valores oficiais.', 20, yPosition);
    
    // Save the PDF
    doc.save(`calculo-rescisao-${new Date().toISOString().slice(0,10)}.pdf`);
}

function shareResults() {
    const totalAmount = document.getElementById('totalAmount').textContent;
    const textToShare = `Calculei minha rescisão trabalhista: Total a receber ${totalAmount}. Faça seu cálculo em: ${window.location.href}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Meu cálculo de rescisão trabalhista',
            text: textToShare,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(textToShare)
            .then(() => alert('Resultado copiado para a área de transferência!'))
            .catch(err => console.error('Erro ao copiar:', err));
    }
}
