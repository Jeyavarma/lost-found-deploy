# MongoDB Setup & Queries

## Installation Options

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```

### Option 2: Native Installation
```bash
./install-mongodb.sh
```

### Option 3: MongoDB Atlas (Cloud)
Update .env with Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mcc-lost-found
```

## Database Setup
```bash
# Connect to database
mongosh
use mcc-lost-found
```

## User Queries
```javascript
// Find user by email
db.users.findOne({ email: "student@mcc.edu.in" })

// Create new user
db.users.insertOne({
  name: "New Student",
  email: "newstudent@mcc.edu.in",
  password: "$2a$10$hashedpassword",
  role: "student",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Update user role
db.users.updateOne(
  { email: "student@mcc.edu.in" },
  { $set: { role: "staff" } }
)
```

## Item Queries
```javascript
// Find all lost items
db.items.find({ status: "lost" })

// Find items by category
db.items.find({ category: "Electronics" })

// Find items reported by specific user
db.items.find({ reportedBy: ObjectId("user_id_here") })

// Update item status
db.items.updateOne(
  { _id: ObjectId("item_id_here") },
  { $set: { status: "resolved" } }
)
```

## Aggregation Queries
```javascript
// Count items by status
db.items.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Items with user details
db.items.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "reportedBy",
      foreignField: "_id",
      as: "reporter"
    }
  }
])
```