"""
LifeGrid - Geospatial Helpers
CSE494: Intelligent NoSQL Databases

Coordinates and boundaries for realistic Indian metropolitan and regional nodes:
Ludhiana, Chandigarh, Delhi, Amritsar, Jalandhar, Mumbai, Bengaluru.
"""

import math
import random
from typing import Dict, Any, Tuple

INDIAN_CITIES = {
    "Ludhiana": {"lat": 30.9010, "lng": 75.8573, "state": "Punjab", "pincode_prefix": "14100"},
    "Chandigarh": {"lat": 30.7333, "lng": 76.7794, "state": "Chandigarh", "pincode_prefix": "16001"},
    "Delhi": {"lat": 28.6139, "lng": 77.2090, "state": "Delhi", "pincode_prefix": "11000"},
    "Amritsar": {"lat": 31.6340, "lng": 74.8723, "state": "Punjab", "pincode_prefix": "14300"},
    "Jalandhar": {"lat": 31.3260, "lng": 75.5762, "state": "Punjab", "pincode_prefix": "14400"},
    "Mumbai": {"lat": 19.0760, "lng": 72.8777, "state": "Maharashtra", "pincode_prefix": "40000"},
    "Bengaluru": {"lat": 12.9716, "lng": 77.5946, "state": "Karnataka", "pincode_prefix": "56000"},
}


def make_geojson_point(longitude: float, latitude: float) -> Dict[str, Any]:
    """
    Constructs a standard GeoJSON Point object: [lng, lat]
    """
    return {
        "type": "Point",
        "coordinates": [round(longitude, 6), round(latitude, 6)]
    }


def random_city_coordinate(city_name: str, radius_km: float = 12.0) -> Tuple[float, float, str, str, str]:
    """
    Generates a realistic random coordinate around the city center within radius_km.
    Returns: (longitude, latitude, city, state, pincode)
    """
    center = INDIAN_CITIES.get(city_name, INDIAN_CITIES["Ludhiana"])
    # 1 deg latitude ~= 111km. 1 deg longitude ~= 111km * cos(lat)
    r_lat = (random.uniform(-radius_km, radius_km)) / 111.0
    r_lng = (random.uniform(-radius_km, radius_km)) / (111.0 * math.cos(math.radians(center["lat"])))
    lat = round(center["lat"] + r_lat, 6)
    lng = round(center["lng"] + r_lng, 6)
    pincode = f"{center['pincode_prefix']}{random.randint(1, 9)}"
    return lng, lat, city_name, center["state"], pincode


def haversine_distance_km(coord1: list, coord2: list) -> float:
    """
    Calculates great-circle distance between two [lng, lat] points in kilometers.
    """
    lng1, lat1 = coord1
    lng2, lat2 = coord2
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(6371.0 * c, 2)
