/* ============================================================
 * OptiCalc Pro — App Principal
 * Auth (Supabase) + Navegação SPA + UI das 11 calculadoras
 * ============================================================ */

// ============================================================
// SUPABASE CONFIG
// ============================================================
var SUPABASE_URL = 'https://szrckdyqwymebursuwqa.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cmNrZHlxd3ltZWJ1cnN1d3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODI4NDksImV4cCI6MjA5MDM1ODg0OX0.U-zZBZIhWcCV9BmmbMWySFDp2ky0hinpICAZrYY8Ayg';
var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var currentUser = null;
var appInitialized = false;

// ============================================================
// AUTH
// ============================================================
window.onload = function() { checkSession(); };

async function checkSession() {
    var { data } = await _supabase.auth.getSession();
    if (data.session) {
        currentUser = data.session.user;
        await initApp();
    }
    _supabase.auth.onAuthStateChange(function(event, session) {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            initApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            appInitialized = false;
            document.getElementById('auth-screen').style.display = '';
            document.getElementById('app-screen').style.display = 'none';
        }
    });
}

function showAuthTab(tab) {
    document.getElementById('auth-form-login').classList.remove('active');
    document.getElementById('auth-form-register').classList.remove('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    hideAuthMessages();

    if (tab === 'login') {
        document.getElementById('auth-form-login').classList.add('active');
        document.getElementById('tab-login').classList.add('active');
    } else {
        document.getElementById('auth-form-register').classList.add('active');
        document.getElementById('tab-register').classList.add('active');
    }
}

function showAuthError(msg) {
    var el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('auth-success').style.display = 'none';
}

function showAuthSuccess(msg) {
    var el = document.getElementById('auth-success');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('auth-error').style.display = 'none';
}

function hideAuthMessages() {
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
}

function checkPasswordMatch() {
    var pw = document.getElementById('reg-password').value;
    var pwc = document.getElementById('reg-password-confirm').value;
    var msg = document.getElementById('password-match-msg');

    if (pwc === '') {
        msg.textContent = '';
        msg.className = 'password-match';
    } else if (pw === pwc) {
        msg.textContent = '✓ Senhas conferem';
        msg.className = 'password-match match';
    } else {
        msg.textContent = '✗ Senhas não conferem';
        msg.className = 'password-match no-match';
    }
}

async function doLogin() {
    hideAuthMessages();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    if (!email || !password) {
        showAuthError('Preencha email e senha.');
        return;
    }

    var btn = document.getElementById('btn-login');
    btn.disabled = true;

    var { error } = await _supabase.auth.signInWithPassword({ email: email, password: password });

    btn.disabled = false;

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            showAuthError('Email ou senha incorretos.');
        } else if (error.message.includes('Email not confirmed')) {
            showAuthError('Confirme seu email antes de acessar. Verifique sua caixa de entrada.');
        } else {
            showAuthError(error.message);
        }
    }
}

async function doRegister() {
    hideAuthMessages();
    var nome = document.getElementById('reg-nome').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;
    var passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (!nome || !email || !password || !passwordConfirm) {
        showAuthError('Preencha todos os campos.');
        return;
    }

    if (password !== passwordConfirm) {
        showAuthError('As senhas não conferem.');
        return;
    }

    if (password.length < 6) {
        showAuthError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    var btn = document.getElementById('btn-register');
    btn.disabled = true;

    var { data, error } = await _supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { nome: nome }
        }
    });

    btn.disabled = false;

    if (error) {
        if (error.message.includes('already registered')) {
            showAuthError('Este email já está cadastrado. Tente fazer login.');
        } else {
            showAuthError(error.message);
        }
        return;
    }

    // Verificar se precisa confirmação por email
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        showAuthError('Este email já está cadastrado.');
    } else {
        showAuthSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
        // Limpar campos
        document.getElementById('reg-nome').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-password-confirm').value = '';
        document.getElementById('password-match-msg').textContent = '';
    }
}

async function doLogout() {
    await _supabase.auth.signOut();
}

// ============================================================
// APP INIT
// ============================================================
async function initApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = '';

    // Exibir nome do usuário
    var userName = currentUser.user_metadata?.nome || currentUser.email;
    document.getElementById('user-name-display').textContent = 'Olá, ' + userName.split(' ')[0];

    if (!appInitialized) {
        appInitialized = true;
        renderCalcGrid();
    }
}

// ============================================================
// CALCULADORAS — DEFINIÇÃO
// ============================================================
var CALCULADORAS = [
    {
        id: 'vertex',
        icon: '🔄',
        titulo: 'Distância ao Vértice',
        descricao: 'Compensação de poder quando a distância lente-olho muda',
        render: renderVertexCalc
    },
    {
        id: 'tilt',
        icon: '📐',
        titulo: 'Inclinação e Wrap',
        descricao: 'Compensação para inclinação pantoscópica e wrap facial',
        render: renderTiltCalc
    },
    {
        id: 'cylinders',
        icon: '✖️',
        titulo: 'Cilindros Cruzados',
        descricao: 'Combinar duas prescrições em eixos oblíquos',
        render: renderCylindersCalc
    },
    {
        id: 'magnification',
        icon: '🔍',
        titulo: 'Magnificação',
        descricao: 'Calcular aumento/redução aparente da lente',
        render: renderMagnificationCalc
    },
    {
        id: 'thickness',
        icon: '📏',
        titulo: 'Espessura de Lente',
        descricao: 'Estimar espessura central e de borda',
        render: renderThicknessCalc
    },
    {
        id: 'vertical',
        icon: '⚖️',
        titulo: 'Desequilíbrio Vertical',
        descricao: 'Prisma diferencial ao nível de leitura',
        render: renderVerticalCalc
    },
    {
        id: 'blanksize',
        icon: '📦',
        titulo: 'Tamanho do Blank',
        descricao: 'Diâmetro mínimo do blank para montagem',
        render: renderBlankSizeCalc
    },
    {
        id: 'compounding',
        icon: '🔀',
        titulo: 'Compor Prismas',
        descricao: 'Combinar prisma vertical e horizontal',
        render: renderCompoundingCalc
    },
    {
        id: 'resolving',
        icon: '🔃',
        titulo: 'Resolver Prismas',
        descricao: 'Decompor prisma em componentes H e V',
        render: renderResolvingCalc
    },
    {
        id: 'induced',
        icon: '🎯',
        titulo: 'Prisma Induzido',
        descricao: 'Efeito prismático por descentração',
        render: renderInducedCalc
    },
    {
        id: 'surface',
        icon: '🌀',
        titulo: 'Curva de Superfície',
        descricao: 'Converter entre Raio, Sagitta e Poder',
        render: renderSurfaceCalc
    }
];

// ============================================================
// GRID DE CALCULADORAS
// ============================================================
function renderCalcGrid() {
    var grid = document.getElementById('calc-grid');
    grid.innerHTML = '';

    CALCULADORAS.forEach(function(calc) {
        var card = document.createElement('div');
        card.className = 'calc-card';
        card.onclick = function() { openCalculator(calc.id); };
        card.innerHTML =
            '<span class="card-icon">' + calc.icon + '</span>' +
            '<div class="card-title">' + calc.titulo + '</div>' +
            '<div class="card-desc">' + calc.descricao + '</div>';
        grid.appendChild(card);
    });
}

function openCalculator(id) {
    var calc = CALCULADORAS.find(function(c) { return c.id === id; });
    if (!calc) return;

    document.getElementById('calc-view-title').textContent = calc.icon + ' ' + calc.titulo;
    var body = document.getElementById('calc-view-body');
    body.innerHTML = '';

    calc.render(body);

    document.getElementById('calc-view').classList.add('active');
    document.getElementById('calc-grid-page').style.display = 'none';
}

function closeCalculator() {
    document.getElementById('calc-view').classList.remove('active');
    document.getElementById('calc-grid-page').style.display = '';
}

// ============================================================
// HELPERS UI
// ============================================================
function createField(label, id, type, placeholder, defaultVal) {
    return '<div class="calc-field">' +
        '<label for="' + id + '">' + label + '</label>' +
        '<input type="' + (type || 'number') + '" id="' + id + '" placeholder="' + (placeholder || '') + '" ' +
        'value="' + (defaultVal !== undefined ? defaultVal : '') + '" step="any">' +
        '</div>';
}

function createSelect(label, id, options) {
    var html = '<div class="calc-field"><label for="' + id + '">' + label + '</label><select id="' + id + '">';
    options.forEach(function(opt) {
        html += '<option value="' + opt.value + '">' + opt.label + '</option>';
    });
    html += '</select></div>';
    return html;
}

function createMaterialSelect(id) {
    var opts = MATERIAIS.map(function(m) {
        return { value: m.indice, label: m.nome + ' (' + m.indice + ')' };
    });
    return createSelect('Material', id, opts);
}

function createResultsDiv(id) {
    return '<div class="calc-results" id="' + id + '"></div>';
}

function showResults(containerId, rows) {
    var div = document.getElementById(containerId);
    var html = '<div class="calc-results-title">✅ Resultado</div>';
    rows.forEach(function(row) {
        var cls = row.highlight ? ' highlight' : '';
        if (row.rx) cls = ' rx';
        html += '<div class="result-row">' +
            '<span class="result-label">' + row.label + '</span>' +
            '<span class="result-value' + cls + '">' + row.value + '</span>' +
            '</div>';
    });
    div.innerHTML = html;
    div.classList.add('show');

    // Scroll suave até o resultado
    setTimeout(function() { div.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
}

// ============================================================
// RENDER CALCULADORAS INDIVIDUAIS
// ============================================================

// 1. Vertex Distance
function renderVertexCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Prescrição</div>' +
        '<div class="calc-row">' + createField('Esfera (D)', 'v-sph', 'number', '-4.00') + createField('Cilindro (D)', 'v-cyl', 'number', '0.00', '0') + '</div>' +
        '<div class="calc-row full">' + createField('Eixo (°)', 'v-axis', 'number', '180', '180') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Distâncias</div>' +
        '<div class="calc-row">' + createField('Dist. Refratada (mm)', 'v-dist-ref', 'number', '12', '12') + createField('Dist. Ajustada (mm)', 'v-dist-fit', 'number', '14', '14') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcVertex()">🧮 Calcular Compensação</button>' +
        createResultsDiv('v-results');
}

function doCalcVertex() {
    var sph = parseFloat(document.getElementById('v-sph').value) || 0;
    var cyl = parseFloat(document.getElementById('v-cyl').value) || 0;
    var axis = parseFloat(document.getElementById('v-axis').value) || 180;
    var distRef = parseFloat(document.getElementById('v-dist-ref').value) || 12;
    var distFit = parseFloat(document.getElementById('v-dist-fit').value) || 14;

    var r = calcVertexDistance(sph, cyl, axis, distRef, distFit);
    showResults('v-results', [
        { label: 'Rx Compensada', value: r.descricao, rx: true },
        { label: 'Esfera', value: r.sphere.toFixed(2) + ' D' },
        { label: 'Cilindro', value: r.cylinder.toFixed(2) + ' D' },
        { label: 'Eixo', value: r.axis + '°' },
        { label: 'Variação', value: (distRef - distFit) + ' mm' }
    ]);
}

// 2. Lens Tilt & Wrap
function renderTiltCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Olho</div>' +
        '<div class="eye-selector">' +
        '<input type="radio" name="t-eye" id="t-eye-r" value="right" checked>' +
        '<label for="t-eye-r" class="active" onclick="toggleEye(this, \'t-eye-r\')">👁 Direito</label>' +
        '<input type="radio" name="t-eye" id="t-eye-l" value="left">' +
        '<label for="t-eye-l" onclick="toggleEye(this, \'t-eye-l\')">👁 Esquerdo</label>' +
        '</div></div>' +
        '<div class="calc-section"><div class="calc-section-title">Prescrição Desejada</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 't-sph', 'number', '4.00') + createField('Cilindro (D)', 't-cyl', 'number', '0.00', '0') + createField('Eixo (°)', 't-axis', 'number', '180', '180') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Ângulos de Inclinação</div>' +
        '<div class="calc-row">' + createField('Incl. Pantoscópica (°)', 't-panto', 'number', '10', '10') + createField('Wrap Facial (°)', 't-wrap', 'number', '5', '0') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Material</div>' +
        '<div class="calc-row full">' + createMaterialSelect('t-material') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcTilt()">🧮 Calcular Compensação</button>' +
        createResultsDiv('t-results');
}

function toggleEye(el, radioId) {
    document.getElementById(radioId).checked = true;
    el.parentElement.querySelectorAll('label').forEach(function(l) { l.classList.remove('active'); });
    el.classList.add('active');
}

function doCalcTilt() {
    var eye = document.querySelector('input[name="t-eye"]:checked').value;
    var sph = parseFloat(document.getElementById('t-sph').value) || 0;
    var cyl = parseFloat(document.getElementById('t-cyl').value) || 0;
    var axis = parseFloat(document.getElementById('t-axis').value) || 180;
    var panto = parseFloat(document.getElementById('t-panto').value) || 0;
    var wrap = parseFloat(document.getElementById('t-wrap').value) || 0;
    var n = parseFloat(document.getElementById('t-material').value) || 1.499;

    var r = calcLensTilt(eye, sph, cyl, axis, panto, wrap, n);
    showResults('t-results', [
        { label: 'Rx para Encomendar', value: r.descricao, rx: true },
        { label: 'Esfera', value: r.sphere.toFixed(2) + ' D' },
        { label: 'Cilindro', value: r.cylinder.toFixed(2) + ' D' },
        { label: 'Eixo', value: r.axis + '°' },
        { label: 'Inclinação Efetiva', value: r.tiltEfetivo + '°' }
    ]);
}

// 3. Crossed Cylinders
function renderCylindersCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Prescrição 1</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'cc-sph1', 'number', '+2.00') + createField('Cilindro (D)', 'cc-cyl1', 'number', '-1.00') + createField('Eixo (°)', 'cc-axis1', 'number', '90') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Prescrição 2</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'cc-sph2', 'number', '+1.00') + createField('Cilindro (D)', 'cc-cyl2', 'number', '-0.50') + createField('Eixo (°)', 'cc-axis2', 'number', '45') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcCylinders()">🧮 Calcular Combinação</button>' +
        createResultsDiv('cc-results');
}

function doCalcCylinders() {
    var sph1 = parseFloat(document.getElementById('cc-sph1').value) || 0;
    var cyl1 = parseFloat(document.getElementById('cc-cyl1').value) || 0;
    var ax1 = parseFloat(document.getElementById('cc-axis1').value) || 180;
    var sph2 = parseFloat(document.getElementById('cc-sph2').value) || 0;
    var cyl2 = parseFloat(document.getElementById('cc-cyl2').value) || 0;
    var ax2 = parseFloat(document.getElementById('cc-axis2').value) || 180;

    var r = calcCrossedCylinders(sph1, cyl1, ax1, sph2, cyl2, ax2);
    showResults('cc-results', [
        { label: 'Rx Resultante', value: r.descricao, rx: true },
        { label: 'Esfera', value: r.sphere.toFixed(2) + ' D' },
        { label: 'Cilindro', value: r.cylinder.toFixed(2) + ' D' },
        { label: 'Eixo', value: r.axis + '°' }
    ]);
}

// 4. Spectacle Magnification
function renderMagnificationCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Prescrição</div>' +
        '<div class="calc-row">' + createField('Esfera (D)', 'm-sph', 'number', '-4.00') + createField('Cilindro (D)', 'm-cyl', 'number', '0.00', '0') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Parâmetros da Lente</div>' +
        '<div class="calc-row">' + createField('Dist. Vértice (mm)', 'm-vertex', 'number', '14', '14') + createField('Curva Base (D)', 'm-base', 'number', '4.00', '4') + '</div>' +
        '<div class="calc-row">' + createField('Esp. Central (mm)', 'm-ct', 'number', '2.0', '2') + createMaterialSelect('m-material') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcMag()">🧮 Calcular Magnificação</button>' +
        createResultsDiv('m-results');
}

function doCalcMag() {
    var sph = parseFloat(document.getElementById('m-sph').value) || 0;
    var cyl = parseFloat(document.getElementById('m-cyl').value) || 0;
    var vertex = parseFloat(document.getElementById('m-vertex').value) || 14;
    var base = parseFloat(document.getElementById('m-base').value) || 4;
    var ct = parseFloat(document.getElementById('m-ct').value) || 2;
    var n = parseFloat(document.getElementById('m-material').value) || 1.499;

    var r = calcSpectacleMagnification(sph, cyl, vertex, base, ct, n);
    showResults('m-results', [
        { label: 'Magnificação (esfera)', value: r.magnification_sph.toFixed(4) + '×', highlight: true },
        { label: 'Percentual', value: (r.percentual_sph >= 0 ? '+' : '') + r.percentual_sph.toFixed(2) + '%', highlight: true },
        { label: 'Fator de Poder', value: r.powerFactor_sph.toFixed(4) },
        { label: 'Fator de Forma', value: r.shapeFactor.toFixed(4) }
    ]);
}

// 5. Lens Thickness
function renderThicknessCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Prescrição</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'th-sph', 'number', '-4.00') + createField('Cilindro (D)', 'th-cyl', 'number', '0.00', '0') + createField('Eixo (°)', 'th-axis', 'number', '180', '180') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Armação</div>' +
        '<div class="calc-row triple">' + createField('DNP (mm)', 'th-ipd', 'number', '32', '32') + createField('Aro (mm)', 'th-eye', 'number', '52', '52') + createField('Ponte (mm)', 'th-bridge', 'number', '18', '18') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Material e Espessura Mín.</div>' +
        '<div class="calc-row">' + createMaterialSelect('th-material') + createField('Esp. Mínima (mm)', 'th-min', 'number', '1.5', '1.5') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcThickness()">🧮 Calcular Espessura</button>' +
        createResultsDiv('th-results');
}

function doCalcThickness() {
    var sph = parseFloat(document.getElementById('th-sph').value) || 0;
    var cyl = parseFloat(document.getElementById('th-cyl').value) || 0;
    var axis = parseFloat(document.getElementById('th-axis').value) || 180;
    var ipd = parseFloat(document.getElementById('th-ipd').value) || 32;
    var eye = parseFloat(document.getElementById('th-eye').value) || 52;
    var bridge = parseFloat(document.getElementById('th-bridge').value) || 18;
    var n = parseFloat(document.getElementById('th-material').value) || 1.499;
    var minT = parseFloat(document.getElementById('th-min').value) || 1.5;

    var r = calcLensThickness(sph, cyl, axis, ipd, eye, bridge, n, minT);
    showResults('th-results', [
        { label: 'Espessura Central', value: r.centerThickness.toFixed(2) + ' mm', highlight: true },
        { label: 'Borda Nasal', value: r.edgeThickness_nasal.toFixed(2) + ' mm', highlight: true },
        { label: 'Borda Temporal', value: r.edgeThickness_temporal.toFixed(2) + ' mm' },
        { label: 'Decentração', value: r.decentracao.toFixed(2) + ' mm' },
        { label: 'Curva Base (est.)', value: r.baseCurveEstimada.toFixed(2) + ' D' }
    ]);
}

// 6. Vertical Imbalance
function renderVerticalCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Olho Direito (OD)</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'vi-sph-od', 'number', '-2.00') + createField('Cilindro (D)', 'vi-cyl-od', 'number', '-1.00') + createField('Eixo (°)', 'vi-ax-od', 'number', '180', '180') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Olho Esquerdo (OE)</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'vi-sph-oe', 'number', '-4.00') + createField('Cilindro (D)', 'vi-cyl-oe', 'number', '-1.00') + createField('Eixo (°)', 'vi-ax-oe', 'number', '180', '180') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Nível de Leitura</div>' +
        '<div class="calc-row full">' + createField('Abaixo do CO (mm)', 'vi-reading', 'number', '10', '10') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcVertical()">🧮 Calcular Desequilíbrio</button>' +
        createResultsDiv('vi-results');
}

function doCalcVertical() {
    var sOD = parseFloat(document.getElementById('vi-sph-od').value) || 0;
    var cOD = parseFloat(document.getElementById('vi-cyl-od').value) || 0;
    var aOD = parseFloat(document.getElementById('vi-ax-od').value) || 180;
    var sOE = parseFloat(document.getElementById('vi-sph-oe').value) || 0;
    var cOE = parseFloat(document.getElementById('vi-cyl-oe').value) || 0;
    var aOE = parseFloat(document.getElementById('vi-ax-oe').value) || 180;
    var rl = parseFloat(document.getElementById('vi-reading').value) || 10;

    var r = calcVerticalImbalance(sOD, cOD, aOD, sOE, cOE, aOE, rl);
    showResults('vi-results', [
        { label: 'Desequilíbrio', value: r.desequilibrio.toFixed(2) + 'Δ', highlight: true },
        { label: 'Significativo?', value: r.significativo ? '⚠️ Sim (≥ 1.0Δ)' : '✅ Não' },
        { label: 'Prisma OD', value: r.prismaOD.toFixed(2) + 'Δ ' + r.direcaoOD },
        { label: 'Prisma OE', value: r.prismaOE.toFixed(2) + 'Δ ' + r.direcaoOE },
        { label: 'Poder Vertical OD', value: r.poderVerticalOD.toFixed(2) + ' D' },
        { label: 'Poder Vertical OE', value: r.poderVerticalOE.toFixed(2) + ' D' }
    ]);
}

// 7. Blank Size
function renderBlankSizeCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Medidas</div>' +
        '<div class="calc-row">' + createField('DIP/DNP (mm)', 'bs-ipd', 'number', '64', '64') + createField('ED (mm)', 'bs-ed', 'number', '56', '56') + '</div>' +
        '<div class="calc-row">' + createField('Aro (mm)', 'bs-eye', 'number', '52', '52') + createField('Ponte (mm)', 'bs-bridge', 'number', '18', '18') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcBlank()">🧮 Calcular Blank</button>' +
        createResultsDiv('bs-results');
}

function doCalcBlank() {
    var ipd = parseFloat(document.getElementById('bs-ipd').value) || 64;
    var ed = parseFloat(document.getElementById('bs-ed').value) || 56;
    var eye = parseFloat(document.getElementById('bs-eye').value) || 52;
    var bridge = parseFloat(document.getElementById('bs-bridge').value) || 18;

    var r = calcBlankSize(ipd, eye, bridge, ed);
    showResults('bs-results', [
        { label: 'Tamanho Mín. do Blank', value: r.minBlankSize.toFixed(1) + ' mm', highlight: true },
        { label: 'Blank Recomendado', value: r.blankSizeRecomendado + ' mm', highlight: true },
        { label: 'DG (Aro + Ponte)', value: r.DG + ' mm' },
        { label: 'Decentração (por olho)', value: r.decentracao.toFixed(1) + ' mm' }
    ]);
}

// 8. Compounding Prisms
function renderCompoundingCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Olho</div>' +
        '<div class="eye-selector">' +
        '<input type="radio" name="cp-eye" id="cp-eye-r" value="right" checked>' +
        '<label for="cp-eye-r" class="active" onclick="toggleEye(this, \'cp-eye-r\')">👁 Direito</label>' +
        '<input type="radio" name="cp-eye" id="cp-eye-l" value="left">' +
        '<label for="cp-eye-l" onclick="toggleEye(this, \'cp-eye-l\')">👁 Esquerdo</label>' +
        '</div></div>' +
        '<div class="calc-section"><div class="calc-section-title">Prismas</div>' +
        '<div class="calc-row">' + createField('Prisma Vertical (Δ)', 'cp-vert', 'number', '3') +
        createSelect('Direção V', 'cp-vdir', [{ value: 'BU', label: 'Base Up (BU)' }, { value: 'BD', label: 'Base Down (BD)' }]) + '</div>' +
        '<div class="calc-row">' + createField('Prisma Horizontal (Δ)', 'cp-horiz', 'number', '4') +
        createSelect('Direção H', 'cp-hdir', [{ value: 'BI', label: 'Base In (BI)' }, { value: 'BO', label: 'Base Out (BO)' }]) + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcCompound()">🧮 Calcular Resultante</button>' +
        createResultsDiv('cp-results');
}

function doCalcCompound() {
    var eye = document.querySelector('input[name="cp-eye"]:checked').value;
    var vert = parseFloat(document.getElementById('cp-vert').value) || 0;
    var vdir = document.getElementById('cp-vdir').value;
    var horiz = parseFloat(document.getElementById('cp-horiz').value) || 0;
    var hdir = document.getElementById('cp-hdir').value;

    var r = calcCompoundPrism(eye, vert, vdir, horiz, hdir);
    showResults('cp-results', [
        { label: 'Prisma Resultante', value: r.descricao, highlight: true },
        { label: 'Magnitude', value: r.resultante.toFixed(2) + 'Δ' },
        { label: 'Ângulo da Base', value: r.angulo + '°' }
    ]);
}

// 9. Resolving Prisms
function renderResolvingCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Olho</div>' +
        '<div class="eye-selector">' +
        '<input type="radio" name="rp-eye" id="rp-eye-r" value="right" checked>' +
        '<label for="rp-eye-r" class="active" onclick="toggleEye(this, \'rp-eye-r\')">👁 Direito</label>' +
        '<input type="radio" name="rp-eye" id="rp-eye-l" value="left">' +
        '<label for="rp-eye-l" onclick="toggleEye(this, \'rp-eye-l\')">👁 Esquerdo</label>' +
        '</div></div>' +
        '<div class="calc-section"><div class="calc-section-title">Prisma Total</div>' +
        '<div class="calc-row">' + createField('Prisma (Δ)', 'rp-total', 'number', '5') + createField('Ângulo da Base (°)', 'rp-angle', 'number', '37') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcResolve()">🧮 Resolver Componentes</button>' +
        createResultsDiv('rp-results');
}

function doCalcResolve() {
    var eye = document.querySelector('input[name="rp-eye"]:checked').value;
    var total = parseFloat(document.getElementById('rp-total').value) || 0;
    var angle = parseFloat(document.getElementById('rp-angle').value) || 0;

    var r = calcResolvePrism(eye, total, angle);
    showResults('rp-results', [
        { label: 'Componentes', value: r.descricao, highlight: true },
        { label: 'Horizontal', value: r.horizontal.toFixed(2) + 'Δ ' + r.direcaoHorizontal },
        { label: 'Vertical', value: r.vertical.toFixed(2) + 'Δ ' + r.direcaoVertical }
    ]);
}

// 10. Induced Prism
function renderInducedCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Prescrição</div>' +
        '<div class="calc-row triple">' + createField('Esfera (D)', 'ip-sph', 'number', '-4.00') + createField('Cilindro (D)', 'ip-cyl', 'number', '-2.00') + createField('Eixo (°)', 'ip-axis', 'number', '45') + '</div>' +
        '</div>' +
        '<div class="calc-section"><div class="calc-section-title">Descentração</div>' +
        '<div class="calc-row">' + createField('Horizontal — In (mm)', 'ip-dec-in', 'number', '3') + createField('Vertical — Up (mm)', 'ip-dec-up', 'number', '2') + '</div>' +
        '<p class="form-helper">Valores positivos = In/Up. Negativos = Out/Down.</p>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcInduced()">🧮 Calcular Prisma Induzido</button>' +
        createResultsDiv('ip-results');
}

function doCalcInduced() {
    var sph = parseFloat(document.getElementById('ip-sph').value) || 0;
    var cyl = parseFloat(document.getElementById('ip-cyl').value) || 0;
    var axis = parseFloat(document.getElementById('ip-axis').value) || 180;
    var decIn = parseFloat(document.getElementById('ip-dec-in').value) || 0;
    var decUp = parseFloat(document.getElementById('ip-dec-up').value) || 0;

    var r = calcInducedPrism(sph, cyl, axis, decIn, decUp);
    showResults('ip-results', [
        { label: 'Prisma Induzido', value: r.descricao, highlight: true },
        { label: 'Horizontal', value: r.prismaHorizontal.toFixed(2) + 'Δ ' + r.direcaoH },
        { label: 'Vertical', value: r.prismaVertical.toFixed(2) + 'Δ ' + r.direcaoV },
        { label: 'Resultante', value: r.resultante.toFixed(2) + 'Δ @ ' + r.angulo + '°' }
    ]);
}

// 11. Surface Curve
function renderSurfaceCalc(container) {
    container.innerHTML =
        '<div class="calc-section"><div class="calc-section-title">Tipo de Entrada</div>' +
        '<div class="calc-row full">' +
        createSelect('Converter a partir de:', 'sc-type', [
            { value: 'radius', label: 'Raio de Curvatura (mm)' },
            { value: 'sagitta', label: 'Sagitta (mm) — Ø 50mm' },
            { value: 'power', label: 'Poder de Superfície (D)' }
        ]) + '</div></div>' +
        '<div class="calc-section"><div class="calc-section-title">Valor</div>' +
        '<div class="calc-row">' + createField('Valor', 'sc-value', 'number', '100') + createMaterialSelect('sc-material') + '</div>' +
        '</div>' +
        '<button class="btn-calculate" onclick="doCalcSurface()">🧮 Converter</button>' +
        createResultsDiv('sc-results');
}

function doCalcSurface() {
    var type = document.getElementById('sc-type').value;
    var value = parseFloat(document.getElementById('sc-value').value) || 0;
    var n = parseFloat(document.getElementById('sc-material').value) || 1.523;

    if (value === 0) return;

    var r = calcSurfaceCurve(type, value, n);
    showResults('sc-results', [
        { label: 'Raio', value: r.radius + ' mm', highlight: true },
        { label: 'Poder real (n=' + n + ')', value: r.powerReal + ' D', highlight: true },
        { label: 'Poder (n=1.530)', value: r.power1530 + ' D' },
        { label: 'Sagitta (Ø 50mm)', value: r.sagitta + ' mm' }
    ]);
}

// ============================================================
// ENTER KEY: calcular ao pressionar Enter em qualquer input
// ============================================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        var calcView = document.getElementById('calc-view');
        if (calcView.classList.contains('active')) {
            var btn = calcView.querySelector('.btn-calculate');
            if (btn) btn.click();
        }

        // Auth forms
        if (document.getElementById('auth-screen').style.display !== 'none') {
            if (document.getElementById('auth-form-login').classList.contains('active')) {
                doLogin();
            } else {
                doRegister();
            }
        }
    }

    // ESC para voltar
    if (e.key === 'Escape') {
        var calcView2 = document.getElementById('calc-view');
        if (calcView2.classList.contains('active')) {
            closeCalculator();
        }
    }
});
