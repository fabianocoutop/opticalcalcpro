/* ============================================================
 * OptiCalc Pro — Calculadoras Ópticas (Darryl Meister / OptiCampus)
 * Todas as 11 fórmulas implementadas em JavaScript puro
 * Ref: https://opticampus.opti.vision/tools/calculators.php
 * ============================================================ */

// ============================================================
// CONSTANTES E MATERIAIS
// ============================================================

var MATERIAIS = [
    { nome: 'Hard Resin (CR-39)', indice: 1.499, abbe: 58 },
    { nome: 'Crown Glass', indice: 1.523, abbe: 59 },
    { nome: 'Trivex', indice: 1.532, abbe: 43 },
    { nome: 'Mid-Index (1.54)', indice: 1.537, abbe: 47 },
    { nome: 'Polycarbonate', indice: 1.586, abbe: 30 },
    { nome: 'High-Index (1.60)', indice: 1.600, abbe: 36 },
    { nome: 'High-Index (1.67)', indice: 1.668, abbe: 32 },
    { nome: 'High-Index (1.74)', indice: 1.740, abbe: 33 }
];

var TOOLING_INDEX = 1.530;

// Helpers
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function round2(val) { return Math.round(val * 100) / 100; }
function round4(val) { return Math.round(val * 10000) / 10000; }

// ============================================================
// 1. VERTEX DISTANCE COMPENSATION
// ============================================================
function calcVertexDistance(sphere, cylinder, axis, distRefracted, distFitted) {
    var deltaD = (distRefracted - distFitted) / 1000; // converter mm para metros

    // Meridiano 1: poder esférico
    var F1 = sphere;
    // Meridiano 2: poder total (esfera + cilindro)
    var F2 = sphere + cylinder;

    // Compensação para cada meridiano
    var F1_comp = F1 / (1 - deltaD * F1);
    var F2_comp = F2 / (1 - deltaD * F2);

    // Reconstruir Sph/Cyl
    var newSphere = round2(F1_comp);
    var newCylinder = round2(F2_comp - F1_comp);
    var newAxis = axis;

    // Se cilindro original era zero, manter zero
    if (cylinder === 0) {
        newCylinder = 0;
    }

    return {
        sphere: newSphere,
        cylinder: newCylinder,
        axis: newAxis,
        descricao: formatRx(newSphere, newCylinder, newAxis)
    };
}

// ============================================================
// 2. LENS TILT & WRAP COMPENSATION
// ============================================================
function calcLensTilt(eye, sphere, cylinder, axis, tiltPanto, tiltWrap, indice) {
    // Converter para radianos
    var tP = toRad(tiltPanto);
    var tW = toRad(tiltWrap);

    // Passo A: Inclinação efetiva
    var cosEffective = Math.cos(tP) * Math.cos(tW);
    var thetaE = Math.acos(cosEffective);

    // Eixo da inclinação efetiva (gamma)
    var gamma = 0;
    if (tiltWrap !== 0) {
        gamma = Math.atan(Math.tan(tP) / Math.tan(tW));
    } else {
        gamma = Math.PI / 2; // 90° (inclinação puramente pantoscópica)
    }

    // Para olho esquerdo, espelhar o eixo do wrap
    if (eye === 'left') {
        gamma = Math.PI - gamma;
    }

    // Converter Rx para Dioptric Power Matrix
    var axisRad = toRad(axis);
    var S = sphere;
    var C = cylinder;

    // Componentes da matriz de poder no referencial do eixo efetivo
    var Fxx = S + C * Math.sin(axisRad) * Math.sin(axisRad);
    var Fyy = S + C * Math.cos(axisRad) * Math.cos(axisRad);
    var Fxy = -C * Math.sin(axisRad) * Math.cos(axisRad);

    // Rotacionar para alinhar com gamma
    var cos2g = Math.cos(2 * gamma);
    var sin2g = Math.sin(2 * gamma);
    var Fmean = (Fxx + Fyy) / 2;
    var Fdiff = (Fxx - Fyy) / 2;

    // Poderes nos meridianos principal e secundário da inclinação
    var F_para = Fmean + Fdiff * cos2g + Fxy * sin2g;  // meridiano paralelo à inclinação
    var F_perp = Fmean - Fdiff * cos2g - Fxy * sin2g;  // meridiano perpendicular

    // Passo C: Compensação para cada meridiano
    var sin2 = Math.sin(thetaE) * Math.sin(thetaE);
    var tan2 = Math.tan(thetaE) * Math.tan(thetaE);

    var F_para_comp = F_para / (1 + sin2 / (2 * indice));
    var F_perp_comp = F_perp;

    // Cilindro induzido pela inclinação
    var cyl_induced = -F_para_comp * tan2;

    // Poder total compensado nos dois meridianos
    var Ftotal_para = F_para_comp + cyl_induced;
    var Ftotal_perp = F_perp_comp;

    // Reconstruir Rx no referencial original
    // Rotacionar de volta
    var newFmean = (Ftotal_para + Ftotal_perp) / 2;
    var newFdiff = (Ftotal_para - Ftotal_perp) / 2;

    var newFxx = newFmean + newFdiff * cos2g;
    var newFyy = newFmean - newFdiff * cos2g;
    var newFxy = newFdiff * sin2g;

    // Extrair Sph/Cyl/Axis da matriz
    var result = matrixToRx(newFxx, newFyy, newFxy);

    return {
        sphere: round2(result.sphere),
        cylinder: round2(result.cylinder),
        axis: Math.round(result.axis),
        tiltEfetivo: round2(toDeg(thetaE)),
        descricao: formatRx(round2(result.sphere), round2(result.cylinder), Math.round(result.axis))
    };
}

// Converte Dioptric Power Matrix de volta para Sph/Cyl/Axis
function matrixToRx(Fxx, Fyy, Fxy) {
    var cylPower = Math.sqrt((Fxx - Fyy) * (Fxx - Fyy) + 4 * Fxy * Fxy);
    var sphEquiv = (Fxx + Fyy) / 2;

    var sphere, cylinder, axis;

    if (cylPower < 0.01) {
        sphere = sphEquiv;
        cylinder = 0;
        axis = 0;
    } else {
        cylinder = -cylPower;
        sphere = sphEquiv - cylinder / 2;

        // Calcular eixo
        var theta = 0.5 * Math.atan2(2 * Fxy, Fxx - Fyy);
        axis = toDeg(theta);

        // Normalizar eixo para 1-180
        if (axis < 0) axis += 180;
        if (axis > 180) axis -= 180;
        if (axis === 0) axis = 180;
    }

    return { sphere: sphere, cylinder: cylinder, axis: axis };
}

// ============================================================
// 3. CROSSED CYLINDERS (Combinação de Cilindros Cruzados)
// ============================================================
function calcCrossedCylinders(sph1, cyl1, axis1, sph2, cyl2, axis2) {
    var a1 = toRad(axis1);
    var a2 = toRad(axis2);

    // Cilindro resultante (adição vetorial - Thompson)
    var C_res = Math.sqrt(
        cyl1 * cyl1 + cyl2 * cyl2 + 2 * cyl1 * cyl2 * Math.cos(2 * (a1 - a2))
    );

    // Eixo resultante
    var sinSum = cyl1 * Math.sin(2 * a1) + cyl2 * Math.sin(2 * a2);
    var cosSum = cyl1 * Math.cos(2 * a1) + cyl2 * Math.cos(2 * a2);
    var A_res = 0.5 * Math.atan2(sinSum, cosSum);
    var axisRes = toDeg(A_res);

    // Normalizar eixo
    if (axisRes < 0) axisRes += 180;
    if (axisRes > 180) axisRes -= 180;
    if (axisRes === 0) axisRes = 180;

    // Esfera resultante
    var S_res = (sph1 + sph2) + (cyl1 + cyl2 - C_res) / 2;

    // Manter sinal do cilindro consistente (negativo = convenção minus-cyl)
    if (C_res > 0 && cyl1 <= 0 && cyl2 <= 0) {
        C_res = -C_res;
        S_res = S_res + C_res; // ajustar esfera
        S_res = S_res - C_res; // desfazer pois transposição: S_new = S + C, C_new = -C, axis_new = axis + 90
        // Na verdade, se ambos cilindros são negativos, o resultado será negativo
    }

    // Forçar convenção minus-cylinder se necessário
    if (C_res > 0) {
        S_res = S_res + C_res;
        C_res = -C_res;
        axisRes = axisRes + 90;
        if (axisRes > 180) axisRes -= 180;
    }

    return {
        sphere: round2(S_res),
        cylinder: round2(C_res),
        axis: Math.round(axisRes),
        descricao: formatRx(round2(S_res), round2(C_res), Math.round(axisRes))
    };
}

// ============================================================
// 4. SPECTACLE MAGNIFICATION
// ============================================================
function calcSpectacleMagnification(sphere, cylinder, vertexDist, baseCurve, centerThickness, indice) {
    var h = vertexDist / 1000;    // mm para metros
    var t = centerThickness / 1000; // mm para metros
    var F1 = baseCurve;
    var n = indice;

    // Calcular para meridiano esférico e meridiano esf+cil
    var Fv1 = sphere;
    var Fv2 = sphere + cylinder;

    var PF1 = 1 / (1 - h * Fv1);
    var PF2 = 1 / (1 - h * Fv2);

    var SF = 1 / (1 - (t / n) * F1);

    var SM1 = PF1 * SF;
    var SM2 = PF2 * SF;

    var mag1_pct = (SM1 - 1) * 100;
    var mag2_pct = (SM2 - 1) * 100;

    return {
        magnification_sph: round4(SM1),
        magnification_cyl: round4(SM2),
        percentual_sph: round2(mag1_pct),
        percentual_cyl: round2(mag2_pct),
        powerFactor_sph: round4(PF1),
        powerFactor_cyl: round4(PF2),
        shapeFactor: round4(SF)
    };
}

// ============================================================
// 5. LENS THICKNESS
// ============================================================
function calcLensThickness(sphere, cylinder, axis, ipd, eyesize, bridge, indice, minThickness) {
    var DG = eyesize + bridge; // distância geométrica
    var dec = (DG - ipd) / 2;  // decentração (+ = nasal)

    // Poderes nos dois meridianos principais
    var F1 = sphere;                    // meridiano do eixo
    var F2 = sphere + cylinder;          // meridiano perpendicular

    // Base curve estimada (Vogel's rule simplificada)
    var sphEquiv = sphere + cylinder / 2;
    var baseCurve;
    if (sphEquiv >= 0) {
        baseCurve = sphEquiv + 6;
    } else {
        baseCurve = sphEquiv / 2 + 6;
    }
    if (baseCurve < 0.50) baseCurve = 0.50;

    // Raios efetivos nas 4 direções (nasal, temporal, superior, inferior)
    var y_nasal = eyesize / 2 + Math.abs(dec);
    var y_temporal = eyesize / 2 - Math.abs(dec);
    if (y_temporal < 0) y_temporal = 0;
    var y_vertical = eyesize / 2; // simplificação (armação circular)

    // Sagitta exata: s = R - sqrt(R² - y²)
    // R = (n-1) * 1000 / F
    function sagitta(power, y, n) {
        if (Math.abs(power) < 0.001) return 0;
        var R = Math.abs((n - 1) * 1000 / power);
        if (y > R) y = R; // clampar
        return R - Math.sqrt(R * R - y * y);
    }

    // Aproximação: s ≈ y² × F / (2000 × (n-1))
    function sagittaApprox(power, y, n) {
        return (y * y * Math.abs(power)) / (2000 * (n - 1));
    }

    // Calcular sagittas para superfícies anterior e posterior
    var s_front_nasal = sagitta(baseCurve, y_nasal, indice);
    var s_back_nasal = sagitta(baseCurve - F1, y_nasal, indice);

    var s_front_temporal = sagitta(baseCurve, y_temporal, indice);
    var s_back_temporal = sagitta(baseCurve - F1, y_temporal, indice);

    var CT, ET_nasal, ET_temporal;

    if (sphere >= 0) {
        // Lente positiva: calcular CT a partir de ET mínima
        var minET = minThickness || 1.0;
        var ET_needed = minET;
        CT = ET_needed + s_front_nasal - s_back_nasal;
        if (CT < minET + 0.5) CT = minET + 0.5; // mínimo razoável

        ET_nasal = round2(CT - s_front_nasal + s_back_nasal);
        ET_temporal = round2(CT - s_front_temporal + s_back_temporal);
    } else {
        // Lente negativa: calcular ET a partir de CT mínima
        var minCT = minThickness || 1.5;
        CT = minCT;

        ET_nasal = round2(CT + Math.abs(s_back_nasal) - Math.abs(s_front_nasal));
        ET_temporal = round2(CT + Math.abs(s_back_temporal) - Math.abs(s_front_temporal));
    }

    return {
        centerThickness: round2(CT),
        edgeThickness_nasal: Math.abs(ET_nasal),
        edgeThickness_temporal: Math.abs(ET_temporal),
        decentracao: round2(dec),
        baseCurveEstimada: round2(baseCurve),
        y_nasal: round2(y_nasal),
        y_temporal: round2(y_temporal)
    };
}

// ============================================================
// 6. VERTICAL IMBALANCE
// ============================================================
function calcVerticalImbalance(sphOD, cylOD, axisOD, sphOE, cylOE, axisOE, readingLevel) {
    // Poder no meridiano vertical (90°)
    // F_vertical = Sph + Cyl × sin²(Axis)
    var Fv_OD = sphOD + cylOD * Math.pow(Math.sin(toRad(axisOD)), 2);
    var Fv_OE = sphOE + cylOE * Math.pow(Math.sin(toRad(axisOE)), 2);

    // Regra de Prentice: Δ = c × F (c em cm)
    var c = readingLevel / 10; // mm para cm

    var prismaOD = Fv_OD * c;
    var prismaOE = Fv_OE * c;

    var imbalance = Math.abs(prismaOD - prismaOE);

    // Direção do prisma (base up ou down)
    var dirOD = prismaOD > 0 ? 'BU' : 'BD';
    var dirOE = prismaOE > 0 ? 'BU' : 'BD';

    return {
        poderVerticalOD: round2(Fv_OD),
        poderVerticalOE: round2(Fv_OE),
        prismaOD: round2(Math.abs(prismaOD)),
        prismaOE: round2(Math.abs(prismaOE)),
        direcaoOD: dirOD,
        direcaoOE: dirOE,
        desequilibrio: round2(imbalance),
        significativo: imbalance >= 1.0 // >= 1.0Δ é clinicamente significativo
    };
}

// ============================================================
// 7. SINGLE VISION BLANK SIZE
// ============================================================
function calcBlankSize(ipd, eyesize, bridge, ed) {
    var DG = eyesize + bridge;     // distância geométrica
    var dec = Math.abs(DG - ipd);  // decentração total

    var MBS = ed + dec;

    // Arredondar para próximo tamanho de blank disponível (múltiplo de 2)
    var MBS_arredondado = Math.ceil(MBS / 2) * 2;

    return {
        minBlankSize: round2(MBS),
        blankSizeRecomendado: MBS_arredondado,
        decentracao: round2(dec / 2), // por olho
        DG: DG
    };
}

// ============================================================
// 8. COMPOUNDING PRISMS (Retangular → Polar)
// ============================================================
function calcCompoundPrism(eye, vertPrism, vertDir, horizPrism, horizDir) {
    // Converter para componentes com sinal
    var V = vertPrism;
    var H = horizPrism;

    // Convenção TABO
    // OD: In=0°(+H), Up=90°(+V), Out=180°(-H), Down=270°(-V)
    // OE: Out=0°(+H), Up=90°(+V), In=180°(-H), Down=270°(-V)

    if (vertDir === 'BD') V = -V;
    if (eye === 'right') {
        if (horizDir === 'BO') H = -H; // Out = 180° = negativo
    } else {
        if (horizDir === 'BI') H = -H; // In no OE = 180° = negativo
    }

    var resultante = Math.sqrt(V * V + H * H);
    var angulo = toDeg(Math.atan2(V, H));

    // Normalizar ângulo 0-360
    if (angulo < 0) angulo += 360;

    return {
        resultante: round2(resultante),
        angulo: Math.round(angulo),
        descricao: round2(resultante) + 'Δ @ ' + Math.round(angulo) + '°'
    };
}

// ============================================================
// 9. RESOLVING PRISMS (Polar → Retangular)
// ============================================================
function calcResolvePrism(eye, totalPrism, baseAngle) {
    var angRad = toRad(baseAngle);

    var H = totalPrism * Math.cos(angRad);
    var V = totalPrism * Math.sin(angRad);

    // Determinar direções
    var vertDir, horizDir;

    if (V >= 0) {
        vertDir = 'BU';
    } else {
        vertDir = 'BD';
    }

    if (eye === 'right') {
        horizDir = H >= 0 ? 'BI' : 'BO';
    } else {
        horizDir = H >= 0 ? 'BO' : 'BI';
    }

    return {
        horizontal: round2(Math.abs(H)),
        vertical: round2(Math.abs(V)),
        direcaoHorizontal: horizDir,
        direcaoVertical: vertDir,
        descricao: round2(Math.abs(H)) + 'Δ ' + horizDir + ', ' + round2(Math.abs(V)) + 'Δ ' + vertDir
    };
}

// ============================================================
// 10. INDUCED PRISM (Prisma Induzido por Descentração)
// ============================================================
function calcInducedPrism(sphere, cylinder, axis, decIn, decUp) {
    var A = toRad(axis);
    var x = decIn;   // positivo = In
    var y = decUp;    // positivo = Up

    // Regra de Prentice Generalizada
    // P_h = [(S + C*sin²A)*x - (C*sinA*cosA)*y] / 10
    // P_v = [-(C*sinA*cosA)*x + (S + C*cos²A)*y] / 10

    var sinA = Math.sin(A);
    var cosA = Math.cos(A);

    var P_h = ((sphere + cylinder * sinA * sinA) * x - (cylinder * sinA * cosA) * y) / 10;
    var P_v = (-(cylinder * sinA * cosA) * x + (sphere + cylinder * cosA * cosA) * y) / 10;

    // Resultante
    var resultante = Math.sqrt(P_h * P_h + P_v * P_v);
    var angulo = toDeg(Math.atan2(P_v, P_h));
    if (angulo < 0) angulo += 360;

    // Direções
    var dirH = P_h >= 0 ? 'BI' : 'BO';
    var dirV = P_v >= 0 ? 'BU' : 'BD';

    return {
        prismaHorizontal: round2(Math.abs(P_h)),
        prismaVertical: round2(Math.abs(P_v)),
        direcaoH: dirH,
        direcaoV: dirV,
        resultante: round2(resultante),
        angulo: Math.round(angulo),
        descricao: round2(Math.abs(P_h)) + 'Δ ' + dirH + ', ' + round2(Math.abs(P_v)) + 'Δ ' + dirV
    };
}

// ============================================================
// 11. SURFACE CURVE CONVERSION
// ============================================================
function calcSurfaceCurve(inputType, value, indice) {
    var result = {};

    if (inputType === 'radius') {
        var R = value;
        result.radius = round2(R);
        result.powerReal = round2((indice - 1) * 1000 / R);
        result.power1530 = round2(530 / R);
        // Sagitta para diâmetro 50mm
        var y = 25;
        if (R >= y) {
            result.sagitta = round2(R - Math.sqrt(R * R - y * y));
        } else {
            result.sagitta = 'N/A (raio muito curto)';
        }
    } else if (inputType === 'sagitta') {
        var s = value;
        var y2 = 25;
        // R = (s² + y²) / (2s)
        var R2 = (s * s + y2 * y2) / (2 * s);
        result.radius = round2(R2);
        result.sagitta = round2(s);
        result.powerReal = round2((indice - 1) * 1000 / R2);
        result.power1530 = round2(530 / R2);
    } else if (inputType === 'power') {
        var F = value;
        var R3 = (indice - 1) * 1000 / F;
        result.radius = round2(Math.abs(R3));
        result.powerReal = round2(F);
        result.power1530 = round2(530 / Math.abs(R3));
        var y3 = 25;
        if (Math.abs(R3) >= y3) {
            result.sagitta = round2(Math.abs(R3) - Math.sqrt(R3 * R3 - y3 * y3));
        } else {
            result.sagitta = 'N/A';
        }
    }

    return result;
}

// ============================================================
// HELPERS
// ============================================================
function formatRx(sph, cyl, axis) {
    var result = '';
    if (sph >= 0) result += '+';
    result += sph.toFixed(2) + ' DS';

    if (cyl !== 0) {
        result += ' / ';
        if (cyl >= 0) result += '+';
        result += cyl.toFixed(2) + ' DC × ' + axis + '°';
    }

    return result;
}
