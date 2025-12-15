const mongoose = require("mongoose");
const { Schema } = mongoose;

const hashtagSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    posts: [{
      type: mongoose.Types.ObjectId,
      ref: "post"
    }],
    usageCount: {
      type: Number,
      default: 1
    },
    trendingScore: {
      type: Number,
      default: 0,
      index: true
    },
    lastUsed: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

hashtagSchema.index({ trendingScore: -1, lastUsed: -1 });
hashtagSchema.index({ usageCount: -1 });

hashtagSchema.methods.calculateTrendingScore = function() {
  const hoursSinceLastUse = (Date.now() - this.lastUsed) / (1000 * 60 * 60);
  const decayFactor = Math.exp(-hoursSinceLastUse / 24); 
  this.trendingScore = this.usageCount * decayFactor;
  return this.trendingScore;
};

hashtagSchema.statics.getTrending = async function(limit = 10) {
  const hashtags = await this.find({
    lastUsed: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
  });

  for (const hashtag of hashtags) {
    hashtag.calculateTrendingScore();
    await hashtag.save();
  }

  return this.find()
    .sort('-trendingScore -usageCount')
    .limit(limit)
    .select('name usageCount trendingScore posts');
};

module.exports = mongoose.model("hashtag", hashtagSchema);