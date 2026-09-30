from pydantic import BaseModel,Field
class BusinessCreate(BaseModel):
 name:str=Field(min_length=2,max_length=160)
 legal_name:str|None=None
 country:str=Field(default='ES',min_length=2,max_length=2)
 currency:str=Field(default='EUR',min_length=3,max_length=3)
class EmployeeCreate(BaseModel): name:str=Field(min_length=1,max_length=120); photo_url:str|None=None
class LocationCreate(BaseModel):
 name:str=Field(min_length=1,max_length=120); type:str='table'; distribution_mode:str=Field(default='employee',pattern='^(employee|team|custom)$'); fixed_employee_id:str|None=None; employee_percentage:float=Field(default=100,ge=0,le=100); suggested_amounts:list[float]=Field(default=[1,2,3,5],min_length=1,max_length=6)
class BusinessUpdate(BaseModel):
 name:str=Field(min_length=2,max_length=160); legal_name:str|None=None; logo_url:str|None=None; country:str='ES'; currency:str='EUR'
class LocationUpdate(BaseModel):
 name:str=Field(min_length=1,max_length=120); type:str='table'; distribution_mode:str=Field(default='employee',pattern='^(employee|team|custom)$'); fixed_employee_id:str|None=None; employee_percentage:float=Field(default=100,ge=0,le=100); suggested_amounts:list[float]=Field(default=[1,2,3,5],min_length=1,max_length=6)
class CheckoutCreate(BaseModel): public_token:str=Field(min_length=16,max_length=64); employee_id:str; amount:float=Field(gt=0,le=100)
