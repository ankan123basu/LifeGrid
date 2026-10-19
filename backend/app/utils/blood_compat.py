"""
LifeGrid - Blood Group Compatibility Matrix
LifeGrid Core Platform Architecture

Defines clinical RBC (Red Blood Cell) compatibility relations
for emergency matching and AI triage algorithms.
"""

from typing import List, Dict

# Map of recipient blood group -> list of compatible donor blood groups
CAN_RECEIVE_FROM: Dict[str, List[str]] = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
}

# Map of donor blood group -> list of recipient blood groups they can donate to
CAN_DONATE_TO: Dict[str, List[str]] = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
}


def get_compatible_donor_groups(recipient_group: str) -> List[str]:
    """
    Returns all donor blood groups compatible with the given recipient.
    """
    return CAN_RECEIVE_FROM.get(recipient_group, [recipient_group])


def is_compatible(donor_group: str, recipient_group: str) -> bool:
    """
    Returns True if the donor can give RBCs to the recipient.
    """
    return donor_group in CAN_RECEIVE_FROM.get(recipient_group, [])
