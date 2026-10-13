import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeObjectBody(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function requireObjectId(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    throw badRequest(`Invalid ${fieldName}`);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeTeamMembers(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw badRequest('Members must be an array of user IDs');
  }
  return value.map((memberId) => requireObjectId(memberId, 'member id'));
}

function normalizeActivityType(value: unknown) {
  if (typeof value !== 'string') {
    throw badRequest('Activity type is required');
  }
  const type = value.trim();
  if (!type) {
    throw badRequest('Activity type is required');
  }
  return type;
}

function normalizePositiveMinutes(value: unknown) {
  if (value === undefined || value === null || value === '') {
    throw badRequest('Minutes are required');
  }
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Minutes must be a positive number');
  }
  return minutes;
}

function toFocusFromType(activityType: string | undefined) {
  const lower = activityType?.toLowerCase();
  if (!lower) return 'endurance';
  if (['run', 'walk', 'jog', 'sprint'].includes(lower)) return 'endurance';
  if (['lift', 'strength', 'power', 'press'].includes(lower)) return 'strength';
  if (['cycle', 'ride', 'spin'].includes(lower)) return 'cardio';
  return lower;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = normalizeObjectBody(input);
  const userId = requireObjectId(body.userId, 'userId');
  const teamId = requireObjectId(body.teamId, 'teamId');
  const activityType = normalizeActivityType(body.type);
  const minutes = normalizePositiveMinutes(body.minutes);

  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw badRequest('User not found');
  }

  const teamExists = await Team.exists({ _id: teamId });
  if (!teamExists) {
    throw badRequest('Team not found');
  }

  const created = await Activity.create({
    user: userId,
    team: teamId,
    type: activityType,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });

  return created;
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = normalizeObjectBody(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';

  if (!name) {
    throw badRequest('Team name is required');
  }

  if (!mascot) {
    throw badRequest('Team mascot is required');
  }

  const members = normalizeTeamMembers(body.members);
  const team = await Team.create({ name, mascot, members });
  return team;
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  const teamIds = totals.map((entry) => entry._id);
  const teamsById = new Map((await Team.find({ _id: { $in: teamIds } }).lean()).map((team) => [team._id.toString(), team]));

  return totals.map((entry, index) => ({
    teamName: teamsById.get(entry._id.toString())?.name ?? 'Unknown',
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = decodeURIComponent(String(userEmail ?? '')).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    const error = new Error('User not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1, createdAt: -1 }).lean();
  const candidateFocuses = [user.fitnessGoal, toFocusFromType(recentActivity?.type as string | undefined)];

  let workouts = await Workout.find({ focus: { $in: candidateFocuses.filter(Boolean) } }).sort({ minutes: 1 }).lean();
  if (workouts.length === 0) {
    workouts = await Workout.find().sort({ minutes: 1 }).lean();
  }

  const chosenWorkout = workouts[0];
  if (!chosenWorkout) {
    return [];
  }

  const reason = recentActivity
    ? `Based on your recent ${recentActivity.type} activity, this workout matches your ${user.fitnessGoal ?? 'fitness goal'} pattern.`
    : `This workout matches your stated ${user.fitnessGoal} goal.`;

  return [{ ...chosenWorkout, reason }];
}

export { User };
