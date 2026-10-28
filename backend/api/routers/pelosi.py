from fastapi import APIRouter, Query, HTTPException, Body, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.services import pelosi_service
import os

router = APIRouter(prefix="/pelosi", tags=["pelosi"])

@router.get("/")
def get_pelosi(member: str = Query(None), year: int = Query(None), since: str = Query(None), offline: str = Query(None)):
    # Use offline fixture for demo if provided or if no network
    res = pelosi_service.index(member=member, year=year, since=since, offline=offline)
    if res.get("status") == "DATA UNAVAILABLE":
        # Try fixture fallback
        # 2026FD.zip is in tests/fixtures/trader-pelosi
        fixture_zip = "tests/fixtures/trader-pelosi/2026FD.zip"
        if os.path.exists(fixture_zip):
            # Try to load via offline
            res2 = pelosi_service.index(member=member, year=year or 2026, offline=os.path.dirname(fixture_zip))
            if res2.get("status") == "ok":
                res = res2
            else:
                # Return with disclaimer anyway
                return {
                    "status": "PARTIAL DATA",
                    "filings": res.get("filings", []),
                    "count": 0,
                    "error": res.get("error"),
                    "disclaimer": "PUBLIC DISCLOSURE DATA - filings may be delayed up to 45 days",
                }
        else:
            return {"status": "DATA UNAVAILABLE", "error": res.get("error"), "filings": [], "disclaimer": "PUBLIC DISCLOSURE DATA"}
    # Add disclaimer
    if isinstance(res, dict):
        res["disclaimer"] = "PUBLIC DISCLOSURE DATA - Members must disclose trades within 30-45 days. Not inside information."
        res["source"] = "House Clerk disclosures-clerk.house.gov"
    return res

@router.get("/member/{member}")
def get_member(member: str, year: int = Query(None)):
    return get_pelosi(member=member, year=year)

@router.post("/index")
def post_index(body: dict = Body(...)):
    member = body.get("member") or body.get("congress_member")
    year = body.get("year")
    since = body.get("since")
    return get_pelosi(member=member, year=year, since=since)

@router.get("/report/{doc_id}")
def get_report(doc_id: str):
    res = pelosi_service.fetch_report(doc_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res
