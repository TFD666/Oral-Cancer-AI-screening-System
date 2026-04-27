from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import torch
from supabase import Client

supabase_admin: Optional[Client] = None
supabase_auth: Optional[Client] = None
executor: Optional[ThreadPoolExecutor] = None
model_b1 = None
model_b2 = None
device: Optional[torch.device] = None
