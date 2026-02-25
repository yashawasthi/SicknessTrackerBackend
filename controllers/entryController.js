import DailyEntry from '../models/DailyEntry.js';

function dateToKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDateInput(input) {
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) return null;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export async function upsertEntry(req, res) {
  try {
    const { date, isSick, severity } = req.body;
    const normalized = normalizeDateInput(date);
    if (!normalized) return res.status(400).json({ message: 'Invalid date.' });
    if (typeof isSick !== 'boolean') return res.status(400).json({ message: 'isSick must be boolean.' });

    let finalSeverity = null;
    if (isSick) {
      if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
        return res.status(400).json({ message: 'Severity must be an integer from 1 to 5 for sick days.' });
      }
      finalSeverity = severity;
    }

    const dateKey = dateToKey(normalized);

    const updated = await DailyEntry.findOneAndUpdate(
      { userId: req.user.id, dateKey },
      { userId: req.user.id, date: normalized, dateKey, isSick, severity: finalSeverity },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      entry: {
        id: updated._id,
        date: updated.date,
        dateKey: updated.dateKey,
        isSick: updated.isSick,
        severity: updated.severity
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save entry.', error: error.message });
  }
}

export async function getEntriesByYear(req, res) {
  try {
    const year = Number.parseInt(req.params.year, 10);
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      return res.status(400).json({ message: 'Invalid year.' });
    }

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const entries = await DailyEntry.find({
      userId: req.user.id,
      date: { $gte: start, $lt: end }
    })
      .sort({ date: 1 })
      .select('_id date dateKey isSick severity');

    res.json({
      year,
      entries: entries.map((entry) => ({
        id: entry._id,
        date: entry.date,
        dateKey: entry.dateKey,
        isSick: entry.isSick,
        severity: entry.severity
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch entries.', error: error.message });
  }
}

export async function getYears(req, res) {
  try {
    const years = await DailyEntry.aggregate([
      { $match: { userId: req.user.id } },
      {
        $project: {
          year: { $year: '$date' }
        }
      },
      { $group: { _id: '$year' } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ years: years.map((y) => y._id) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch years.', error: error.message });
  }
}
