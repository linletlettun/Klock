from pydantic import BaseModel
from typing import Optional


class NacosConfigCreate(BaseModel):
    data_id: str
    group: str = "DEFAULT_GROUP"
    content: str
    config_type: str = "text"  # text, json, yaml, xml, properties


class NacosConfigBulkDeploy(BaseModel):
    data_id: str
    group: str = "DEFAULT_GROUP"
    content: str
    config_type: str = "text"
    namespaces: list[str]


class NacosConfigResponse(BaseModel):
    data_id: str
    group: str
    namespace: str
    content: Optional[str] = None
    config_type: str
