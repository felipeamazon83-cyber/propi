from pydantic import BaseModel,Field
class BusinessCreate(BaseModel): name:str=Field(min_length=2,max_length=160); country:str='ES'; currency:str='EUR'
class EmployeeCreate(BaseModel): name:str=Field(min_length=1,max_length=120); photo_url:str|None=None
class LocationCreate(BaseModel): name:str=Field(min_length=1,max_length=120); type:str='table'
class CheckoutCreate(BaseModel): public_token:str=Field(min_length=16,max_length=64); employee_id:str; amount:float=Field(gt=0,le=100)
