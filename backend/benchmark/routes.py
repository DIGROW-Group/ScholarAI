"""
Benchmark Routes
API endpoints for benchmark analysis functionality
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .benchmark_analysis import BenchmarkAnalysis

# Create blueprint
benchmark_bp = Blueprint('benchmark', __name__, url_prefix='/api/benchmark')

@benchmark_bp.route('/test', methods=['GET'])
def test_benchmark():
    """Test endpoint to verify benchmark routes are working"""
    return jsonify({
        'message': 'Benchmark API is working!',
        'status': 'success',
        'database_initialized': CompanyProfile is not None
    })

# Global variables to store database instances
db = None
CompanyProfile = None

def init_benchmark_routes(database, company_profile_model):
    """Initialize benchmark routes with database instances"""
    global db, CompanyProfile
    db = database
    CompanyProfile = company_profile_model

@benchmark_bp.route('/profiles', methods=['GET'])
@jwt_required()
def get_profiles_for_benchmark():
    """Get all completed profiles for benchmark analysis"""
    try:
        print("🔍 [BENCHMARK API] /profiles endpoint called")
        print(f"🔍 [BENCHMARK API] CompanyProfile model available: {CompanyProfile is not None}")
        print(f"🔍 [BENCHMARK API] Database available: {db is not None}")
        
        if not CompanyProfile:
            print("❌ [BENCHMARK API] CompanyProfile model not initialized")
            return jsonify({'error': 'Database not initialized'}), 500
            
        print("🔍 [BENCHMARK API] Querying completed profiles...")
        profiles = CompanyProfile.query.filter_by(status='completed').all()
        print(f"🔍 [BENCHMARK API] Found {len(profiles)} completed profiles")
        
        profile_list = []
        # Clean company names for display
        from services.profile_verification import _normalize_company_name
        
        for profile in profiles:
            profile_list.append({
                'id': profile.id,
                'company_name': _normalize_company_name(profile.company_name),
                'fiscal_years': profile.fiscal_years,
                'created_at': profile.created_at.isoformat(),
                'updated_at': profile.updated_at.isoformat() if profile.updated_at else None
            })
        
        result = {
            'profiles': profile_list,
            'count': len(profile_list)
        }
        
        print(f"✅ [BENCHMARK API] Returning {len(profile_list)} profiles")
        return jsonify(result)
    
    except Exception as e:
        print(f"❌ [BENCHMARK API] Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@benchmark_bp.route('/profiles/<profile_id>/analyze', methods=['POST'])
@jwt_required()
def generate_benchmark_analysis(profile_id):
    """Generate benchmark analysis for a specific profile"""
    try:
        if not CompanyProfile:
            return jsonify({'error': 'Database not initialized'}), 500
            
        # Get the profile
        profile = CompanyProfile.query.get_or_404(profile_id)
        
        if profile.status != 'completed':
            return jsonify({'error': 'Profile must be completed to generate benchmark analysis'}), 400
        
        if not profile.profile_data:
            return jsonify({'error': 'No profile data available for analysis'}), 400
        
        # Get fiscal year and selected models from request
        fiscal_year = request.json.get('fiscal_year') if request.json else None
        selected_models = request.json.get('selected_models') if request.json else None
        if not fiscal_year:
            fiscal_year = profile.fiscal_years
        
        # Generate benchmark analysis
        benchmark_service = BenchmarkAnalysis()
        results = benchmark_service.generate_benchmark_analysis(
            profile.profile_data,
            profile.company_name,
            fiscal_year,
            selected_models
        )
        
        # Clean company name for display
        from services.profile_verification import _normalize_company_name
        
        return jsonify({
            'profile_id': profile_id,
            'company_name': _normalize_company_name(profile.company_name),
            'fiscal_year': fiscal_year,
            'results': results,
            'available_services': benchmark_service.get_available_services()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@benchmark_bp.route('/services', methods=['GET'])
@jwt_required()
def get_available_services():
    """Get list of available LLM services"""
    try:
        benchmark_service = BenchmarkAnalysis()
        services = benchmark_service.get_available_services()
        
        return jsonify({
            'services': services,
            'count': len(services)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@benchmark_bp.route('/models', methods=['GET'])
@jwt_required()
def get_available_models():
    """Get all available models for each service"""
    try:
        from .config import BenchmarkConfig
        models = BenchmarkConfig.get_available_models()
        
        return jsonify({
            'models': models,
            'services': list(models.keys())
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@benchmark_bp.route('/models/<service_name>', methods=['GET'])
@jwt_required()
def get_models_for_service(service_name):
    """Get available models for a specific service"""
    try:
        from .config import BenchmarkConfig
        models = BenchmarkConfig.get_models_for_service(service_name)
        
        if not models:
            return jsonify({'error': f'Service {service_name} not available'}), 404
        
        return jsonify({
            'service': service_name,
            'models': models,
            'count': len(models)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@benchmark_bp.route('/profiles/<profile_id>', methods=['GET'])
@jwt_required()
def get_profile_details(profile_id):
    """Get detailed profile information for benchmark"""
    try:
        if not CompanyProfile:
            return jsonify({'error': 'Database not initialized'}), 500
            
        profile = CompanyProfile.query.get_or_404(profile_id)
        
        # Clean company name for display
        from services.profile_verification import _normalize_company_name
        
        return jsonify({
            'id': profile.id,
            'company_name': _normalize_company_name(profile.company_name),
            'fiscal_years': profile.fiscal_years,
            'status': profile.status,
            'profile_data': profile.profile_data or {},
            'created_at': profile.created_at.isoformat(),
            'updated_at': profile.updated_at.isoformat() if profile.updated_at else None
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500