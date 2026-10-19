// ============================================================
// LifeGrid - Aggregation Pipelines for MongoDB Compass / mongosh
// LifeGrid Core Platform Architecture
// ============================================================

use('lifegrid_db');

// 1. Blood Stock by Group Across All Hospitals
print("\n--- Pipeline 1: Blood Stock by Group ---");
db.blood_inventory.aggregate([
  {
    $group: {
      _id: "$blood_group",
      total_available: { $sum: "$units_available" },
      total_reserved: { $sum: "$units_reserved" },
      hospitals: { $addToSet: "$hospital_id" }
    }
  },
  {
    $project: {
      blood_group: "$_id",
      total_available: 1,
      total_reserved: 1,
      hospital_count: { $size: "$hospitals" },
      _id: 0
    }
  },
  { $sort: { blood_group: 1 } }
]);

// 2. Critical Shortages Detector (< 5 units)
print("\n--- Pipeline 2: Critical Shortages Detector ---");
db.blood_inventory.aggregate([
  { $match: { units_available: { $lt: 5 } } },
  {
    $lookup: {
      from: "hospitals",
      localField: "hospital_id",
      foreignField: "_id",
      as: "hospital"
    }
  },
  { $unwind: "$hospital" },
  {
    $project: {
      hospital_name: "$hospital.name",
      city: "$hospital.address.city",
      blood_group: 1,
      component: 1,
      units_available: 1,
      _id: 0
    }
  },
  { $sort: { units_available: 1 } }
]);

// 3. Monthly Donation Trend with Running Total ($setWindowFields)
print("\n--- Pipeline 3: Monthly Donation Trend with Running Total ---");
db.donations.aggregate([
  { $match: { status: "COMPLETED" } },
  {
    $project: {
      month: { $dateToString: { format: "%Y-%m", date: "$donated_on" } },
      units: "$units"
    }
  },
  {
    $group: {
      _id: "$month",
      monthly_units: { $sum: "$units" },
      donations: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } },
  {
    $setWindowFields: {
      sortBy: { _id: 1 },
      output: {
        running_total_units: {
          $sum: "$monthly_units",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
]);

// 4. Top 10 Donors by Lifetime Units ($switch)
print("\n--- Pipeline 4: Top 10 Donors + Badge Tier ---");
db.donations.aggregate([
  { $match: { status: "COMPLETED" } },
  {
    $group: {
      _id: "$donor_id",
      lifetime_units: { $sum: "$units" },
      donation_count: { $sum: 1 }
    }
  },
  { $sort: { lifetime_units: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "donor"
    }
  },
  { $unwind: "$donor" },
  {
    $project: {
      name: "$donor.name",
      blood_group: "$donor.blood_group",
      city: "$donor.city",
      lifetime_units: 1,
      badge_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$lifetime_units", 10] }, then: "PLATINUM" },
            { case: { $gte: ["$lifetime_units", 6] }, then: "GOLD" },
            { case: { $gte: ["$lifetime_units", 3] }, then: "SILVER" }
          ],
          default: "BRONZE"
        }
      },
      _id: 0
    }
  }
]);
