from app.services.fpl_adapter import FPLAdapter

# these are created in app.main on startup
_fpl_adapter: FPLAdapter | None = None

def get_fpl_adapter() -> FPLAdapter:
    if _fpl_adapter is None:
        raise RuntimeError("FPL adapter not initialized; ensure startup event created it")
    return _fpl_adapter