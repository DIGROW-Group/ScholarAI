# 📘 CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE
## PROJET : ScholarAI (System of AI-Powered Tutoring & RAG Curriculum)
**Année Universitaire :** 2025 - 2026  
**Établissement :** EMSI (École Marocaine des Sciences de l'Ingénieur)  
**Version :** 1.0.0 (Production Ready)

---

## 📑 1. PRÉSENTATION GÉNÉRALE DU PROJET

### 1.1 Contexte & Problématique
Dans le cadre de l'apprentissage personnalisé et du soutien scolaire (Baccalauréat et Enseignement Supérieur), les étudiants font souvent face à des blocages lors des révisions individuelles. Les outils actuels de conversation générique (LLM généralistes) présentent des risques d'hallucination ou ne respectent pas le programme officiel fixé par l'enseignant.

### 1.2 Solution Apportée : ScholarAI
**ScholarAI** est une plateforme Web intelligente combinant :
1. **RAG (Retrieval-Augmented Generation)** : L'IA se base à 100% sur les supports de cours PDF/TXT réellement déposés par les enseignants.
2. **PFSM (Pedagogical Finite State Machine)** : Un modèle fini d'états pédago-comportementaux guidant l'élève en 3 modes progressifs (*Recall*, *Diagnostic*, *Scaffold*).
3. **Mastery Levels (Niveaux de Maîtrise 0% – 100%)** : Un système d'évaluation dynamique de l'autonomie et des compétences acquises par matière.

---

## 🛠️ 2. ARCHITECTURE TECHNIQUE & STACK TECHNOLOGIQUE

| Composant | Technologie Utilisée | Rôle / Utilisation |
| :--- | :--- | :--- |
| **Frontend UI** | React.js (v18), Material-UI (MUI v5) | Interface utilisateur ultra-moderne, responsive, thème Indigo Glass. |
| **Backend API** | Node.js, Express.js | API RESTful sécurisée, contrôleurs et agents d'IA. |
| **Base de Données** | PostgreSQL & ORM Sequelize | Gestion des utilisateurs, sessions de tutorat, documents de cours et PFSM. |
| **Moteur LLM IA** | Ollama (`qwen2.5:1.5b`) local | Génération ultra-rapide (<3s), réponses en 1 phrase directe avec citation. |
| **Vector Search (RAG)** | ChromaDB / Vector Embeddings | Indexation et recherche sémantique des extraits de cours pertinents. |
| **Sécurité & Auth** | JWT (HttpOnly Cookies) + Bcrypt | Authentification sécurisée avec contrôle d'accès basé sur les rôles (RBAC). |

---

## 🎯 3. SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES

### 👨‍🎓 3.1 Portal Élève (Student Portal)
1. **Tuteur IA Assistant RAG** :
   * Interaction naturelle en français.
   * Réponse en 1 phrase concise avec citation directe du cours (`📚 Source : ...`).
   * 3 Modes d'apprentissage :
     * 🧠 `Recall` : Rappel autonome des formules.
     * 🔍 `Diagnostic` : Identification des blocages.
     * 🧩 `Scaffold` : Guidage pas-à-pas.
2. **Historique Interactif des Discussions (`Recent Discussions`)** :
   * Affichage du titre de la 1ère question posée.
   * Clic pour charger la conversation et la reprendre comme sur ChatGPT.
   * Bouton `+ New Chat` pour ouvrir une nouvelle séance.
3. **Mastery Levels (Visualisation du Progrès)** :
   * Progression dynamique de 0% à 100% avec badges colorés (*Mastered*, *In Progress*, *Needs Practice*, *0% Not Started*).
4. **Visualiseur & Téléchargement de Cours (`DocumentViewerModal`)** :
   * Visualiseur natif `<iframe>` pour les fichiers PDF.
   * Téléchargement direct des supports `.pdf` et `.txt`.

---

### 👨‍🏫 3.2 Portal Enseignant (Teacher Portal)
1. **Navigation à 3 Niveaux par Classe** :
   * Sélection par Matière ➔ Niveau (*1ère Bac, 2ème Bac, Tronc Commun*) ➔ Calendrier & Étudiants.
2. **Bibliothèque de Contenu (`Content Library`)** :
   * Importation, vectorisation RAG et gestion des cours PDF/TXT.
   * Boutons `Afficher` 👁️ et `Télécharger` 📥 sur chaque carte de cours.
3. **Synthèses Quotidiennes IA (`Daily AI Summaries`)** :
   * Analyse automatique et génération du résumé pédagogique des notions travaillées chaque jour.
4. **Évaluation RL (`RLReward`)** :
   * Module de notation et feedback de l'enseignant pour affiner les réponses de l'IA.

---

### 🌐 3.3 Module Sécurité, Geofencing & Assiduité
* **GeofencingAgent** : Vérification de la présence des élèves en classe avec calcul du taux d'assiduité (`Attendance Rate`).
* **Protection Antivirus (ClamAV)** : Scan automatisé lors des imports de fichiers.

---

## 📌 4. LIVRABLES DU PROJET
* 📂 Code Source Complet (Client React & Serveur Node.js).
* 📄 Document PDF officiel du Cahier des Charges (`Cahier_des_Charges_ScholarAI.pdf`).
* 🗄️ Schéma de Base de Données et Seeds d'initialisation (`db:seed`).
