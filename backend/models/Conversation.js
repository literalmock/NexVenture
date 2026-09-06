import mongoose from "mongoose";
import {
  CONVERSATION_TYPES,
  INVESTMENT_DEAL_STATUS,
  MENTORSHIP_ITEM_STATUS,
  MENTORSHIP_WORKSPACE_STATUS,
} from "../utils/enums.js";

const dealRoomDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const investmentDealRoomSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(INVESTMENT_DEAL_STATUS),
      default: INVESTMENT_DEAL_STATUS.ACCEPTED,
      index: true,
    },
    amountRange: {
      type: String,
      default: "",
      trim: true,
    },
    meeting: {
      scheduledAt: {
        type: Date,
        default: null,
      },
      location: {
        type: String,
        default: "",
        trim: true,
        maxlength: 200,
      },
      notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    documents: {
      type: [dealRoomDocumentSchema],
      default: [],
    },
  },
  { _id: false },
);

const mentorshipItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    status: {
      type: String,
      enum: Object.values(MENTORSHIP_ITEM_STATUS),
      default: MENTORSHIP_ITEM_STATUS.TODO,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true, timestamps: true },
);

const mentorshipSessionSchema = new mongoose.Schema(
  {
    scheduledAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    agenda: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const mentorshipResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const mentorshipWorkspaceSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(MENTORSHIP_WORKSPACE_STATUS),
      default: MENTORSHIP_WORKSPACE_STATUS.ACTIVE,
      index: true,
    },
    focusAreas: {
      type: [String],
      default: [],
    },
    goals: {
      type: [mentorshipItemSchema],
      default: [],
    },
    milestones: {
      type: [mentorshipItemSchema],
      default: [],
    },
    nextSession: {
      type: mentorshipSessionSchema,
      default: () => ({}),
    },
    mentorNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    resources: {
      type: [mentorshipResourceSchema],
      default: [],
    },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
    type: {
      type: String,
      enum: Object.values(CONVERSATION_TYPES),
      default: CONVERSATION_TYPES.DIRECT,
    },
    relatedStartupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      default: null,
      index: true,
    },
    relatedPitchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pitch",
      default: null,
      index: true,
    },
    investmentInterestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentInterest",
      default: null,
      index: true,
    },
    mentorshipRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipRequest",
      default: null,
      index: true,
    },
    investmentDealRoom: {
      type: investmentDealRoomSchema,
      default: null,
    },
    mentorshipWorkspace: {
      type: mentorshipWorkspaceSchema,
      default: null,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index(
  { investmentInterestId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { investmentInterestId: { $type: "objectId" } },
  },
);
conversationSchema.index({ "investmentDealRoom.status": 1, updatedAt: -1 });
conversationSchema.index(
  { mentorshipRequestId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { mentorshipRequestId: { $type: "objectId" } },
  },
);
conversationSchema.index({ "mentorshipWorkspace.status": 1, updatedAt: -1 });

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;
