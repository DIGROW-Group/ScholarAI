const axios = require('axios');

class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
    this.useOllama = process.env.USE_OLLAMA === 'true' || !this.apiKey;

    if (this.useOllama) {
      console.log(`🤖 ClaudeService configured to use Ollama with model "${this.ollamaModel}" at ${this.ollamaHost}`);
    } else {
      console.log('🤖 ClaudeService configured to use Anthropic API');
    }
  }

  async generateAIFlashcards({ subject = 'math', topic = 'Dérivation', documentId = null }) {
    const sub = (subject || 'math').toLowerCase();
    const topLower = (topic || '').toLowerCase();

    let flashcards = [];
    let mindmap = {};

    // 1. LOGARITHMES & EXPONENTIELLES (10 QUESTIONS)
    if (topLower.includes('logarithm') || topLower.includes('ln') || topLower.includes('exponentiel')) {
      flashcards = [
        {
          id: 1,
          question: "Quelle est la définition de la fonction Logarithme Népérien $\\ln(x)$ ?",
          hint: "Primitive de 1/x qui s'annule en 1.",
          answer: "La fonction $\\ln(x)$ est l'unique primitive de $x \\mapsto \\frac{1}{x}$ sur $]0, +\\infty[$ qui s'annule en $x = 1$.",
          explanation: "Son domaine de définition strict est $]0, +\\infty[$. $\\ln(1) = 0$ et $\\ln(e) = 1$.",
          difficulty: "Facile"
        },
        {
          id: 2,
          question: "Quelle est la formule de la dérivée du logarithme composé $(\\ln(u(x)))'$ ?",
          hint: "Dérivée de la fonction interne sur la fonction interne.",
          answer: "$(\\ln(u(x)))' = \\frac{u'(x)}{u(x)}$",
          explanation: "Condition d'application : la fonction $u(x)$ doit être strictement positive $u(x) > 0$.",
          difficulty: "Facile"
        },
        {
          id: 3,
          question: "Quelle est la limite remarquable de croissance comparée $\\lim_{x \\to 0^+} x \\ln(x)$ ?",
          hint: "Le terme x prédomine en 0+.",
          answer: "$\\lim_{x \\to 0^+} x \\ln(x) = 0$",
          explanation: "En $0^+$, la puissance de $x$ l'emporte sur la divergence vers $-\\infty$ du logarithme.",
          difficulty: "Moyen"
        },
        {
          id: 4,
          question: "Quelle est la limite remarquable de $\\lim_{x \\to +\\infty} \\frac{\\ln(x)}{x}$ ?",
          hint: "Croissance comparée en +infini.",
          answer: "$\\lim_{x \\to +\\infty} \\frac{\\ln(x)}{x} = 0$",
          explanation: "En $+\\infty$, toute puissance de $x$ croît beaucoup plus vite que $\\ln(x)$.",
          difficulty: "Moyen"
        },
        {
          id: 5,
          question: "Comment transformer un produit $\\ln(a \\cdot b)$ en somme ?",
          hint: "Propriété fondamentale algébrique du logarithme.",
          answer: "$\\ln(a \\cdot b) = \\ln(a) + \\ln(b)$ (pour $a > 0, b > 0$)",
          explanation: "Le logarithme transforme les produits en sommes et les quotients en différences : $\\ln(a/b) = \\ln(a) - \\ln(b)$.",
          difficulty: "Facile"
        },
        {
          id: 6,
          question: "Quelle est l'équation de la tangente à la courbe de $\\ln(x)$ au point d'abscisse $x_0 = 1$ ?",
          hint: "Pente f'(1) = 1 et f(1) = 0.",
          answer: "$y = x - 1$",
          explanation: "Comme $f'(1) = 1/1 = 1$ et $f(1) = 0$, $y = 1 \\cdot (x - 1) + 0 = x - 1$.",
          difficulty: "Difficile"
        },
        {
          id: 7,
          question: "Quelle est la formule de la dérivée de la fonction exponentielle composée $(e^{u(x)})'$ ?",
          hint: "Dérivée de la chaîne exponentielle.",
          answer: "$(e^{u(x)})' = u'(x) \\cdot e^{u(x)}$",
          explanation: "L'exponentielle conserve son terme $e^{u(x)}$ multiplié par la dérivée de l'exposant $u'(x)$.",
          difficulty: "Facile"
        },
        {
          id: 8,
          question: "Quelle est la relation d'équivalence entre $\\ln(x)$ et $e^y$ ?",
          hint: "Fonctions réciproques l'une de l'autre.",
          answer: "$\\ln(x) = y \\iff x = e^y$ (pour $x > 0$ et $y \\in \\mathbb{R}$)",
          explanation: "La fonction exponentielle est la bijecion réciproque de la fonction logarithme népérien.",
          difficulty: "Facile"
        },
        {
          id: 9,
          question: "Quelle est la limite remarquable du taux d'accroissement $\\lim_{x \\to 0} \\frac{\\ln(1+x)}{x}$ ?",
          hint: "Dérivée de ln(1+x) en 0.",
          answer: "$\\lim_{x \\to 0} \\frac{\\ln(1+x)}{x} = 1$",
          explanation: "Correspond au nombre dérivé de la fonction $x \\mapsto \\ln(1+x)$ en $x = 0$.",
          difficulty: "Difficile"
        },
        {
          id: 10,
          question: "Comment déterminer le domaine de définition de la fonction $f(x) = \\ln(3x - 6)$ ?",
          hint: "L'expression sous le logarithme doit être strictement positive.",
          answer: "$D_f = ]2, +\\infty[$",
          explanation: "Il faut résoudre l'inéquation $3x - 6 > 0 \\iff 3x > 6 \\iff x > 2$.",
          difficulty: "Moyen"
        }
      ];

      mindmap = {
        id: "root",
        label: "🌲 Fonctions Logarithmes & Exponentielles",
        color: "#10B981",
        children: [
          {
            id: "b1",
            label: "1. Définition & Domaine",
            color: "#059669",
            children: [
              { id: "b1_1", label: "Domaine: ]0, +∞[" },
              { id: "b1_2", label: "ln(1) = 0 et ln(e) = 1" }
            ]
          },
          {
            id: "b2",
            label: "2. Propriétés Algébriques",
            color: "#3B82F6",
            children: [
              { id: "b2_1", label: "ln(a·b) = ln(a) + ln(b)" },
              { id: "b2_2", label: "ln(a/b) = ln(a) - ln(b)" },
              { id: "b2_3", label: "ln(aⁿ) = n·ln(a)" }
            ]
          },
          {
            id: "b3",
            label: "3. Dérivation & Limites",
            color: "#8B5CF6",
            children: [
              { id: "b3_1", label: "(ln u)' = u' / u" },
              { id: "b3_2", label: "Lim (x→0+) x ln x = 0" },
              { id: "b3_3", label: "Lim (x→+∞) ln x / x = 0" }
            ]
          }
        ]
      };
    } 
    // 2. NOMBRES COMPLEXES (10 QUESTIONS)
    else if (topLower.includes('complex') || topLower.includes('imaginaire') || topLower.includes('z')) {
      flashcards = [
        {
          id: 1,
          question: "Quelle est la forme algébrique d'un nombre complexe $z$ ?",
          hint: "Partie réelle et partie imaginaire.",
          answer: "$z = a + i b$ avec $a = \\text{Re}(z) \\in \\mathbb{R}$, $b = \\text{Im}(z) \\in \\mathbb{R}$ et $i^2 = -1$.",
          explanation: "Tout nombre complexe s'écrit de manière unique comme somme d'un réel et d'un imaginaire pur.",
          difficulty: "Facile"
        },
        {
          id: 2,
          question: "Comment se calcule le module d'un nombre complexe $|z|$ ?",
          hint: "Distance à l'origine dans le plan complexe.",
          answer: "$|z| = \\sqrt{a^2 + b^2} = \\sqrt{z \\cdot \\bar{z}}$",
          explanation: "Le module est toujours un nombre réel positif ou nul : $|z| \\ge 0$.",
          difficulty: "Facile"
        },
        {
          id: 3,
          question: "Quelle est la forme trigonométrique et exponentielle de $z$ ?",
          hint: "Utiliser le module r et l'argument theta.",
          answer: "$z = r (\\cos \\theta + i \\sin \\theta) = r e^{i\\theta}$",
          explanation: "où $r = |z|$ est le module et $\\theta = \\arg(z) [2\\pi]$ est l'argument.",
          difficulty: "Moyen"
        },
        {
          id: 4,
          question: "Quelle est la formule de Moivre pour $(\\cos \\theta + i \\sin \\theta)^n$ ?",
          hint: "Puissance d'un nombre complexe de module 1.",
          answer: "$(\\cos \\theta + i \\sin \\theta)^n = \\cos(n\\theta) + i \\sin(n\\theta) = e^{i n \\theta}$",
          explanation: "Très utile pour linéariser les expressions trigonométriques.",
          difficulty: "Moyen"
        },
        {
          id: 5,
          question: "Comment interpréter géométriquement la distance entre deux points $A(z_A)$ et $B(z_B)$ ?",
          hint: "Module de la différence des affixes.",
          answer: "$AB = |z_B - z_A|$",
          explanation: "La distance $AB$ dans le plan complexe correspond au module du vecteur $\\vec{AB}$.",
          difficulty: "Facile"
        },
        {
          id: 6,
          question: "Quelle est la définition du conjugué $\\bar{z}$ de $z = a + ib$ et sa propriété avec le module ?",
          hint: "Changer le signe de la partie imaginaire.",
          answer: "$\\bar{z} = a - ib$ et $z \\cdot \\bar{z} = |z|^2 = a^2 + b^2$",
          explanation: "Le produit d'un complexe par son conjugué donne toujours un nombre réel positif.",
          difficulty: "Facile"
        },
        {
          id: 7,
          question: "Quelles sont les formules d'Euler pour $\\cos \\theta$ et $\\sin \\theta$ ?",
          hint: "Expression en fonction des exponentielles complexes.",
          answer: "$\\cos \\theta = \\frac{e^{i\\theta} + e^{-i\\theta}}{2}$ et $\\sin \\theta = \\frac{e^{i\\theta} - e^{-i\\theta}}{2i}$",
          explanation: "Formules fondamentales de transformation de la trigonométrie en exponentielles.",
          difficulty: "Difficile"
        },
        {
          id: 8,
          question: "Comment interpréter l'argument du quotient $\\arg\\left(\\frac{z_C - z_A}{z_B - z_A}\\right)$ ?",
          hint: "Angle orienté de deux vecteurs.",
          answer: "$\\arg\\left(\\frac{z_C - z_A}{z_B - z_A}\\right) = (\\vec{AB}, \\vec{AC}) [2\\pi]$",
          explanation: "Mesure l'angle orienté entre les deux vecteurs $\\vec{AB}$ et $\\vec{AC}$ dans le plan.",
          difficulty: "Difficile"
        },
        {
          id: 9,
          question: "À quelle condition géométrique les droites $(AB)$ et $(AC)$ sont-elles perpendiculaires ?",
          hint: "Le quotient des affixes est imaginaire pur.",
          answer: "$\\frac{z_C - z_A}{z_B - z_A} \\in i \\mathbb{R}^* \\iff (AB) \\perp (AC)$",
          explanation: "L'angle orienté vaut $\\pm \\pi/2 [2\\pi]$, soit une partie réelle nulle.",
          difficulty: "Moyen"
        },
        {
          id: 10,
          question: "Comment résoudre l'équation du 2nd degré $az^2 + bz + c = 0$ avec discriminant $\\Delta < 0$ ?",
          hint: "Deux solutions complexes conjuguées.",
          answer: "$z_{1,2} = \\frac{-b \\pm i \\sqrt{|\\Delta|}}{2a}$",
          explanation: "Dans $\\mathbb{C}$, toute équation du second degré admet deux solutions exactement.",
          difficulty: "Moyen"
        }
      ];

      mindmap = {
        id: "root",
        label: "🌀 Nombres Complexes & Géométrie",
        color: "#8B5CF6",
        children: [
          {
            id: "b1",
            label: "Forme Algébrique & Conjugué",
            color: "#3B82F6",
            children: [
              { id: "b1_1", label: "z = a + ib (i² = -1)" },
              { id: "b1_2", label: "Conjugué z̄ = a - ib" }
            ]
          },
          {
            id: "b2",
            label: "Module & Argument",
            color: "#10B981",
            children: [
              { id: "b2_1", label: "Module |z| = √(a² + b²)" },
              { id: "b2_2", label: "Forme Exponentielle: z = r e^(iθ)" }
            ]
          },
          {
            id: "b3",
            label: "Applications Géométriques",
            color: "#F59E0B",
            children: [
              { id: "b3_1", label: "Distance AB = |zB - zA|" },
              { id: "b3_2", label: "Formule de Moivre & Euler" }
            ]
          }
        ]
      };
    }
    // 3. INTÉGRALES & PRIMITIVES (10 QUESTIONS)
    else if (topLower.includes('intégral') || topLower.includes('primitive') || topLower.includes('aire')) {
      flashcards = [
        {
          id: 1,
          question: "Quelle est la définition de l'intégrale $\\int_a^b f(x) dx$ d'une fonction continue $f$ ?",
          hint: "Différence des valeurs d'une primitive F aux bornes.",
          answer: "$\\int_a^b f(x) dx = [F(x)]_a^b = F(b) - F(a)$ où $F$ est une primitive de $f$.",
          explanation: "Si $f(x) \\ge 0$, l'intégrale représente l'aire sous la courbe entre $x = a$ et $x = b$.",
          difficulty: "Facile"
        },
        {
          id: 2,
          question: "Quelle est la formule d'Intégration par Parties (IPP) ?",
          hint: "Intégration du produit u'(x) v(x).",
          answer: "$\\int_a^b u'(x) v(x) dx = [u(x) v(x)]_a^b - \\int_a^b u(x) v'(x) dx$",
          explanation: "Elle permet d'intégrer des produits de fonctions non triviales.",
          difficulty: "Moyen"
        },
        {
          id: 3,
          question: "Quelle est la règle mnémonique ALPES pour le choix de $v(x)$ dans l'IPP ?",
          hint: "Priorité pour poser v(x) à dériver.",
          answer: "A (Arc-tangente), L (Logarithme), P (Polynôme), E (Exponentielle), S (Sinus/Cosinus).",
          explanation: "On pose $v(x)$ la fonction située le plus haut dans la liste ALPES.",
          difficulty: "Facile"
        },
        {
          id: 4,
          question: "Quelle est la formule de la valeur moyenne d'une fonction $f$ sur $[a, b]$ ?",
          hint: "Intégrale divisée par la largeur de l'intervalle.",
          answer: "$\\mu = \\frac{1}{b - a} \\int_a^b f(x) dx$",
          explanation: "Représente la hauteur d'un rectangle de même aire que le domaine sous la courbe.",
          difficulty: "Moyen"
        },
        {
          id: 5,
          question: "Quelle est la propriété de linéarité de l'intégrale ?",
          hint: "Intégrale d'une combinaison linéaire.",
          answer: "$\\int_a^b (\\alpha f(x) + \\beta g(x)) dx = \\alpha \\int_a^b f(x) dx + \\beta \\int_a^b g(x) dx$",
          explanation: "L'intégrale conserve la somme et la multiplication par une constante réelle.",
          difficulty: "Facile"
        },
        {
          id: 6,
          question: "Quelle est la relation de Chasles pour les intégrales ?",
          hint: "Décomposition d'un intervalle [a, c] en insérant un point b.",
          answer: "$\\int_a^c f(x) dx = \\int_a^b f(x) dx + \\int_b^c f(x) dx$",
          explanation: "Valable quel que soit l'ordre des réels $a, b, c$ sur le domaine de continuité.",
          difficulty: "Facile"
        },
        {
          id: 7,
          question: "Quelle est la primitive de la forme $u'(x) \\cdot u(x)^n$ (avec $n \\neq -1$) ?",
          hint: "Puissance d'une fonction u(x).",
          answer: "$F(x) = \\frac{u(x)^{n+1}}{n + 1}$",
          explanation: "Cas particulier fondamental pour intégrer des polynômes composés.",
          difficulty: "Moyen"
        },
        {
          id: 8,
          question: "Quelle est la primitive de la forme $\\frac{u'(x)}{u(x)}$ ?",
          hint: "Logarithme de la valeur absolue.",
          answer: "$F(x) = \\ln|u(x)|$",
          explanation: "Valable sur tout intervalle où la fonction $u(x)$ ne s'annule pas.",
          difficulty: "Facile"
        },
        {
          id: 9,
          question: "Quelle est la propriété de positivité de l'intégrale ?",
          hint: "Si f(x) est positive et a <= b.",
          answer: "Si $f(x) \\ge 0$ pour tout $x \\in [a, b]$ avec $a \\le b$, alors $\\int_a^b f(x) dx \\ge 0$.",
          explanation: "L'intégrale d'une fonction positive sur un intervalle orienté dans le sens positif est positive.",
          difficulty: "Facile"
        },
        {
          id: 10,
          question: "Comment calculer l'aire délimitée entre deux courbes $y = f(x)$ et $y = g(x)$ sur $[a, b]$ ?",
          hint: "Intégrale de la différence positive.",
          answer: "$\\mathcal{A} = \\int_a^b |f(x) - g(x)| dx$ (en unités d'aire)",
          explanation: "Si $f(x) \\ge g(x)$ sur $[a, b]$, l'aire vaut simplement $\\int_a^b (f(x) - g(x)) dx$.",
          difficulty: "Difficile"
        }
      ];

      mindmap = {
        id: "root",
        label: "∫ Calcul d'Intégrales & Primitives",
        color: "#EC4899",
        children: [
          {
            id: "b1",
            label: "1. Primitives Usuelles",
            color: "#3B82F6",
            children: [
              { id: "b1_1", label: "∫ xⁿ dx = xⁿ⁺¹ / (n+1)" },
              { id: "b1_2", label: "∫ 1/x dx = ln|x|" }
            ]
          },
          {
            id: "b2",
            label: "2. Méthodes d'Intégration",
            color: "#10B981",
            children: [
              { id: "b2_1", label: "Intégration par Parties (IPP)" },
              { id: "b2_2", label: "Règle mnémonique ALPES" }
            ]
          }
        ]
      };
    }
    // 4. PHYSIQUE & ONDES (10 QUESTIONS)
    else if (sub.includes('phys') || topLower.includes('onde') || topLower.includes('mécanique')) {
      flashcards = [
        {
          id: 1,
          question: "Quelle est la définition d'une onde mécanique progressive ?",
          hint: "Propagation d'une perturbation.",
          answer: "C'est le phénomène de propagation d'une perturbation dans un milieu matériel sans transport de matière mais avec transport d'énergie.",
          explanation: "Les particules du milieu oscillent autour de leur position d'équilibre puis y reviennent.",
          difficulty: "Facile"
        },
        {
          id: 2,
          question: "Quelle est la formule de la célérité d'une onde $v$ ?",
          hint: "Distance sur durée.",
          answer: "$v = \\frac{d}{\\Delta t}$",
          explanation: "En mètres par seconde (m/s).",
          difficulty: "Facile"
        },
        {
          id: 3,
          question: "Quelle est la relation entre longueur d'onde $\\lambda$, période $T$ et fréquence $f$ ?",
          hint: "Périodicité spatiale et temporelle.",
          answer: "$\\lambda = v \\cdot T = \\frac{v}{f}$",
          explanation: "$\\lambda$ s'exprime en mètres (m), $T$ en secondes (s) et $f$ en Hertz (Hz).",
          difficulty: "Moyen"
        },
        {
          id: 4,
          question: "Comment calculer le retard temporel $\\tau$ de l'onde entre deux points $S$ et $M$ ?",
          hint: "Distance SM divisée par la célérité v.",
          answer: "$\\tau = \\frac{SM}{v}$",
          explanation: "Le mouvement du point $M$ à l'instant $t$ reproduit celui du point $S$ à l'instant $t - \\tau$.",
          difficulty: "Facile"
        },
        {
          id: 5,
          question: "Quelle est la formule de la constante de temps $\\tau$ d'un circuit RC ?",
          hint: "Produit de la résistance R par la capacité C.",
          answer: "$\\tau = R \\cdot C$",
          explanation: "$\\tau$ s'exprime en secondes (s). Elle représente le temps pour charger 63% du condensateur.",
          difficulty: "Facile"
        },
        {
          id: 6,
          question: "Quelle est la loi de décroissance radioactive $N(t)$ ?",
          hint: "Nombre de noyaux radioactifs à l'instant t.",
          answer: "$N(t) = N_0 \\cdot e^{-\\lambda t}$",
          explanation: "$N_0$ est le nombre initial de noyaux et $\\lambda$ est la constante radioactive ($s^{-1}$).",
          difficulty: "Moyen"
        },
        {
          id: 7,
          question: "Quelle est la relation entre la demi-vie $t_{1/2}$ et la constante radioactive $\\lambda$ ?",
          hint: "Temps pour désintégrer la moitié des noyaux.",
          answer: "$t_{1/2} = \\frac{\\ln 2}{\\lambda}$",
          explanation: "À $t = t_{1/2}$, il reste exactement $N_0 / 2$ noyaux radioactifs.",
          difficulty: "Moyen"
        },
        {
          id: 8,
          question: "Quelle est la formule du récart angulaire de diffraction $\\theta$ pour une fente de largeur $a$ ?",
          hint: "Rapport entre la longueur d'onde et la largeur de la fente.",
          answer: "$\\theta = \\frac{\\lambda}{a}$ (en radians)",
          explanation: "La diffraction est d'autant plus marquée que la largeur $a$ est proche de $\\lambda$.",
          difficulty: "Difficile"
        },
        {
          id: 9,
          question: "Quelle est l'énergie $E_c$ emmagasinée dans un condensateur de capacité $C$ sous la tension $u_C$ ?",
          hint: "Énergie électrique du condensateur.",
          answer: "$E_c = \\frac{1}{2} C u_C^2$",
          explanation: "En Joules (J), avec $C$ en Farads (F) et $u_C$ en Volts (V).",
          difficulty: "Moyen"
        },
        {
          id: 10,
          question: "Quelle est la période propre $T_0$ d'un circuit LC idéal (oscillateur non amorti) ?",
          hint: "Formule de Thomson.",
          answer: "$T_0 = 2 \\pi \\sqrt{L C}$",
          explanation: "En secondes (s), avec $L$ l'inductance en Henrys (H) et $C$ la capacité en Farads (F).",
          difficulty: "Difficile"
        }
      ];

      mindmap = {
        id: "root",
        label: "⚡ Ondes Mécaniques & Signal",
        color: "#EF4444",
        children: [
          {
            id: "b1",
            label: "Célérité & Retard",
            color: "#F59E0B",
            children: [
              { id: "b1_1", label: "v = d / Δt" },
              { id: "b1_2", label: "Retard τ = SM / v" }
            ]
          },
          {
            id: "b2",
            label: "Périodicité",
            color: "#3B82F6",
            children: [
              { id: "b2_1", label: "Longueur d'onde λ = v / f" },
              { id: "b2_2", label: "Période T = 1 / f" }
            ]
          }
        ]
      };
    }
    // 5. DÉRIVATION PAR DÉFAUT (10 QUESTIONS)
    else {
      flashcards = [
        {
          id: 1,
          question: "Quelle est la définition du nombre dérivé $f'(a)$ ?",
          hint: "Utiliser la limite du taux d'accroissement quand $h \\to 0$.",
          answer: "$f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}$",
          explanation: "Il représente géométriquement la pente de la droite tangente à la courbe au point d'abscisse $a$.",
          difficulty: "Facile"
        },
        {
          id: 2,
          question: "Quelle est la dérivée d'un produit $(u \\cdot v)'$ ?",
          hint: "Formule produit de deux fonctions dérivables.",
          answer: "$(u \\cdot v)' = u' \\cdot v + u \\cdot v'$",
          explanation: "Attention à ne pas écrire $u' \\cdot v'$, il faut dériver alternativement chaque terme.",
          difficulty: "Facile"
        },
        {
          id: 3,
          question: "Quelle est la dérivée d'un quotient $\\left(\\frac{u}{v}\\right)'$ ?",
          hint: "Formule du quotient.",
          answer: "$\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$",
          explanation: "Condition d'application : la fonction au dénominateur ne doit pas s'annuler $v(x) \\neq 0$.",
          difficulty: "Moyen"
        },
        {
          id: 4,
          question: "Comment déterminer l'équation de la tangente au point $x_0$ ?",
          hint: "Formule de la droite de pente $f'(x_0)$.",
          answer: "$y = f'(x_0) \\cdot (x - x_0) + f(x_0)$",
          explanation: "La droite passe par le point $(x_0, f(x_0))$ avec une pente égale au nombre dérivé $f'(x_0)$.",
          difficulty: "Moyen"
        },
        {
          id: 5,
          question: "Si $f'(x) > 0$ sur un intervalle $I$, quel est le sens de variation de $f$ ?",
          hint: "Lien entre signe de la dérivée et variations.",
          answer: "La fonction $f$ est strictement croissante sur $I$.",
          explanation: "Si la dérivée est négative $f'(x) < 0$, la fonction est strictement décroissante.",
          difficulty: "Facile"
        },
        {
          id: 6,
          question: "Quelle est la dérivée de la fonction puissance $f(x) = x^n$ (avec $n \\in \\mathbb{Z}^*$) ?",
          hint: "Règle de la puissance.",
          answer: "$f'(x) = n \\cdot x^{n-1}$",
          explanation: "Par exemple pour $f(x) = x^3$, sa dérivée est $f'(x) = 3x^2$.",
          difficulty: "Facile"
        },
        {
          id: 7,
          question: "Quelle est la dérivée de la fonction racine carrée $f(x) = \\sqrt{x}$ ?",
          hint: "Dérivée sur ]0, +inf[.",
          answer: "$f'(x) = \\frac{1}{2 \\sqrt{x}}$",
          explanation: "La fonction racine n'est pas dérivable en $x = 0$ (tangente verticale).",
          difficulty: "Moyen"
        },
        {
          id: 8,
          question: "Quelle est la dérivée d'une fonction composée $(g \\circ f)'(x)$ ?",
          hint: "Règle de la chaîne (Chain Rule).",
          answer: "$(g(f(x)))' = f'(x) \\cdot g'(f(x))$",
          explanation: "On multiplie la dérivée de la fonction interne par la dérivée de la fonction externe.",
          difficulty: "Difficile"
        },
        {
          id: 9,
          question: "Quelle est la dérivée de $f(x) = \\sin(x)$ et $g(x) = \\cos(x)$ ?",
          hint: "Dérivées trigonométriques simples.",
          answer: "$(\\sin(x))' = \\cos(x)$ et $(\\cos(x))' = -\\sin(x)$",
          explanation: "Attention au signe moins dans la dérivée du cosinus.",
          difficulty: "Facile"
        },
        {
          id: 10,
          question: "Quelle est la condition nécessaire pour qu'une fonction présente un extrémum local en $x_0$ ?",
          hint: "Annulation et changement de signe de la dérivée.",
          answer: "$f'(x_0) = 0$ et $f'(x)$ change de signe de part et d'autre de $x_0$.",
          explanation: "Si la dérivée s'annule sans changer de signe (ex: $x^3$ en 0), il s'agit d'un point d'inflexion.",
          difficulty: "Difficile"
        }
      ];

      mindmap = {
        id: "root",
        label: `📐 ${topic} (${subject.toUpperCase()})`,
        color: "#4F46E5",
        children: [
          {
            id: "b1",
            label: "1. Définitions & Formules",
            color: "#3B82F6",
            children: [{ id: "b1_1", label: "Taux d'accroissement & Dérivée" }]
          },
          {
            id: "b2",
            label: "2. Applications Pratiques",
            color: "#10B981",
            children: [{ id: "b2_1", label: "Tangente & Tableau de variations" }]
          }
        ]
      };
    }

    return { flashcards, mindmap };
  }
}

module.exports = new ClaudeService();
