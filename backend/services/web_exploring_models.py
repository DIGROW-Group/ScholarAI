"""
Pydantic models for web exploring structured output.
"""
from pydantic import BaseModel, Field
from typing import List, Optional

class CompanyOverview(BaseModel):
    companyFoundationyear: Optional[str] = Field(default=None, description="Year the company was founded")
    companyExpertise: Optional[str] = Field(default=None, description="Company's main area of expertise")
    primary_sector: Optional[str] = Field(default=None, description="Primary business sector")
    legal_form: Optional[str] = Field(default="SARL", description="Legal form of the company")
    companyDefinition: Optional[str] = Field(default=None, description="Brief definition of what the company does")
    staff_count: Optional[str] = Field(default=None, description="Number of employees/staff count")

class Sector(BaseModel):
    title: str = Field(description="Sector title")
    description: str = Field(description="Sector description")

class Market(BaseModel):
    title: str = Field(description="Market title") 
    description: str = Field(description="Market description")

class KeyPerson(BaseModel):
    initials: str = Field(description="Person's initials")
    name: str = Field(description="Full name")
    position: str = Field(description="Position/role in company")

class Contact(BaseModel):
    phone: Optional[str] = Field(default=None, description="Phone number")
    email: Optional[str] = Field(default=None, description="Email address")
    address: Optional[str] = Field(default=None, description="Physical address")
    website: Optional[str] = Field(default=None, description="Website URL")

class WebExplorerOutput(BaseModel):
    companyOverview: CompanyOverview = Field(description="Company overview information")
    sectors: List[Sector] = Field(default_factory=list, description="List of business sectors")
    markets: List[Market] = Field(default_factory=list, description="List of target markets")
    keyPeople: List[KeyPerson] = Field(default_factory=list, description="List of key people")
    contact: Contact = Field(description="Contact information")
