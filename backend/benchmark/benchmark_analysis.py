"""
Benchmark Analysis Service
Generates SWOT analysis, recommendations, and detailed analysis using different LLM models
"""

import json
from typing import Dict, Any, List, Optional
from .llm_services import get_llm_services
from .config import BenchmarkConfig

class BenchmarkAnalysis:
    """Service for generating benchmark analysis using different LLM models"""
    
    def __init__(self):
        self.llm_services = get_llm_services()
    
    def get_system_prompt(self) -> str:
        """Get the system prompt used for analysis"""
        return """Tu es un analyste financier expert spécialisé dans l'analyse d'entreprises marocaines.

        Ta mission est de générer une analyse financière complète et professionnelle basée sur toutes les données disponibles :
        - KPIs financiers extraits des documents
        - Ratios financiers calculés
        - Actualités et veille sectorielle
        - Informations de base de l'entreprise (secteur, marchés, expertise)

        Tu dois générer 3 sections distinctes en français :

        1. ANALYSE SWOT : Forces, faiblesses, opportunités, menaces
        2. RECOMMANDATION STRATÉGIQUE : Générer une recommandation détaillée et complète qui intègre synthèse, évaluation globale et conseils stratégiques
        3. ANALYSE DÉTAILLÉE : Analyse approfondie de la structure financière, incluant l'équilibre dette/capitaux propres, la santé financière, et la capacité de couverture du coût du capital

        Utilise TOUTES les données disponibles pour une analyse cohérente et factuelle.

        Pour la RECOMMANDATION, génère un paragraphe détaillé de 8-10 lignes qui intègre :
        - Une synthèse de la situation financière
        - L'évaluation globale de la performance
        - Des conseils stratégiques concrets et actionables
        - La justification basée sur les données financières réelles

        IMPORTANT : Retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après."""
    
    def prepare_data_context(self, profile_data: Dict[str, Any], company_name: str, fiscal_year: Optional[str] = None) -> str:
        """Prepare the data context for LLM analysis"""
        try:
            # Extract data from profile_data
            web_data = profile_data.get('web_data', {})
            basic_info = web_data.get('basic_info', {})
            company_overview = basic_info.get('companyOverview', {})
            
            primary_sector = company_overview.get('primary_sector', 'Non spécifié')
            company_expertise = company_overview.get('companyExpertise', 'Non spécifié')
            markets = basic_info.get('markets', [])
            sectors = basic_info.get('sectors', [])
            
            # Extract Bizafrix company description for LLM context
            bizafrix_company_description = company_overview.get('bizafrix_company_description', '')
            
            markets_text = ', '.join([str(m.get('title', '')) for m in (markets or []) if m and isinstance(m, dict)])
            sectors_text = ', '.join([str(s.get('title', '')) for s in (sectors or []) if s and isinstance(s, dict)])
            
            # Extract KPIs and ratios
            extracted_kpis = profile_data.get('extracted_kpis', {})
            computed_ratios = profile_data.get('computed_ratios', {})
            news_data = profile_data.get('news', '')
            
            kpis_text = json.dumps(extracted_kpis, indent=2, ensure_ascii=False) if extracted_kpis and isinstance(extracted_kpis, dict) else 'Aucun KPI disponible'
            ratios_text = json.dumps(computed_ratios, indent=2, ensure_ascii=False) if computed_ratios and isinstance(computed_ratios, dict) else 'Aucun ratio calculé'
            news_text = str(news_data) if news_data else 'Aucune actualité disponible'
            
            # Add fiscal year information
            fiscal_year_info = ""
            if fiscal_year:
                fiscal_year_info = f"\n        ANNÉE FISCALE : {fiscal_year}\n"
                fiscal_year_info += f"        IMPORTANT : Utilise l'année {fiscal_year} dans tes recommandations et analyses, pas 'N' ou 'N-1'.\n"

            # Add Bizafrix context if available
            bizafrix_context = ""
            if bizafrix_company_description:
                bizafrix_context = f"""
        CONTEXTE BIZAFRIX (pour guider l'analyse) :
        Description de l'entreprise extraite de Bizafrix : {bizafrix_company_description}
        
        Utilise cette description comme référence pour mieux comprendre l'activité de l'entreprise et enrichir ton analyse SWOT, recommandations et analyse détaillée.
        """

            data_context = f"""COMPAGNIE : {company_name}

        INFORMATIONS DE BASE :
        - Secteur principal : {primary_sector}
        - Expertise : {company_expertise}
        - Marchés : {markets_text}
        - Secteurs d'activité : {sectors_text}
        {bizafrix_context}
        {fiscal_year_info}
        KPIs FINANCIERS EXTRACTES :
        {kpis_text}

        RATIOS FINANCIERS CALCULES :
        {ratios_text}

        ACTUALITÉS ET VEILLE SECTORIELLE :
        {news_text}

        GÉNÈRE UNE RÉPONSE JSON AVEC CETTE STRUCTURE EXACTE :
        {{
        "swot_analysis": {{
            "strengths": ["Force 1", "Force 2", "Force 3"],
            "weaknesses": ["Faiblesse 1", "Faiblesse 2", "Faiblesse 3"],
            "opportunities": ["Opportunité 1", "Opportunité 2", "Opportunité 3"],
            "threats": ["Menace 1", "Menace 2", "Menace 3"]
        }},
        "recommendation": "Recommandation stratégique détaillée et complète (8-10 lignes) intégrant synthèse, évaluation globale et conseils stratégiques",
        "detailed_analysis": "Analyse détaillée de la structure financière",
        "company_definition": "Description structurée de l'entreprise suivant ce format : '[Nom de la société] est un acteur opérant dans le secteur de [secteur d'activité], avec un positionnement [généraliste / spécialisé / de niche] sur [marché ou typologie de clients]. Son modèle repose sur [activité principale]. L'entreprise se différencie par [expertise/avantage concurrentiel]. L'entreprise opère dans plusieurs secteurs d'activité incluant [liste des secteurs].'"
        }}

        Base ton analyse sur les données financières réelles et les indicateurs calculés qui sont toujours en MAD. Sois précis et factuel.
        Pour la company_definition, utilise le contexte Bizafrix si disponible pour enrichir la description avec des informations spécifiques sur l'entreprise.
        IMPORTANT : Retourne UNIQUEMENT le JSON, sans texte avant ou après."""
            
            return data_context
            
        except Exception as e:
            print(f"Error preparing data context: {str(e)}")
            return f"Erreur lors de la préparation des données pour {company_name}"
    
    def generate_benchmark_analysis(self, profile_data: Dict[str, Any], company_name: str, fiscal_year: Optional[str] = None, selected_models: Dict[str, str] = None) -> Dict[str, Any]:
        """Generate benchmark analysis using selected LLM services and models"""
        system_prompt = self.get_system_prompt()
        data_context = self.prepare_data_context(profile_data, company_name, fiscal_year)
        
        # Get services with selected models
        services = get_llm_services(selected_models)
        results = {}
        
        for service_name, service in services.items():
            model_name = service.model_id
            print(f"Generating analysis with {service_name} ({model_name})...")
            try:
                analysis = service.generate_analysis(system_prompt, data_context)
                results[service_name] = {
                    'model_id': model_name,
                    'model_name': BenchmarkConfig.get_model_info(service_name, model_name).get('name', model_name),
                    'swot_analysis': analysis.get('swot_analysis', {}),
                    'recommendation': analysis.get('recommendation', ''),
                    'detailed_analysis': analysis.get('detailed_analysis', ''),
                    'company_definition': analysis.get('company_definition', ''),
                    'status': 'success'
                }
            except Exception as e:
                print(f"Error generating analysis with {service_name} ({model_name}): {str(e)}")
                results[service_name] = {
                    'model_id': model_name,
                    'model_name': BenchmarkConfig.get_model_info(service_name, model_name).get('name', model_name),
                    'swot_analysis': {},
                    'recommendation': f'Erreur: {str(e)}',
                    'detailed_analysis': f'Erreur: {str(e)}',
                    'status': 'error',
                    'error': str(e)
                }
        
        return results
    
    def get_available_services(self) -> List[str]:
        """Get list of available LLM services"""
        return list(self.llm_services.keys())
