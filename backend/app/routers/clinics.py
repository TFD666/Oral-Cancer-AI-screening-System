from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user

router = APIRouter(tags=["clinics"])


@router.get("/nearby-clinics")
def nearby_clinics(
    lat: float = Query(0),
    lng: float = Query(0),
    user=Depends(get_current_user),
):
    """Return nearby dental-care options for the Care page.

    This is a deterministic fallback until a live Places/Maps provider is added.
    The frontend already opens each `maps_url`, so the location still resolves
    through Google Maps when the user asks for directions.
    """
    location_hint = f"{lat},{lng}" if lat or lng else "near me"
    search_url = f"https://www.google.com/maps/search/dental+clinic+{location_hint}"

    return [
        {
            "name": "Dental Clinic Near You",
            "rating": 4.8,
            "distance_km": 1.2,
            "maps_url": search_url,
        },
        {
            "name": "Oral Health Specialist",
            "rating": 4.6,
            "distance_km": 2.4,
            "maps_url": f"https://www.google.com/maps/search/oral+health+specialist+{location_hint}",
        },
        {
            "name": "Emergency Dental Care",
            "rating": 4.5,
            "distance_km": 3.1,
            "maps_url": f"https://www.google.com/maps/search/emergency+dental+care+{location_hint}",
        },
    ]
