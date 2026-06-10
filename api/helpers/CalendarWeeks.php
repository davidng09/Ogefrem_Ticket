<?php
declare(strict_types=1);

function calendarMonthWeeks(int $year, int $month): array
{
    $weeks = [];
    $weekIndex = 0;
    $daysInMonth = (int)date('t', mktime(0, 0, 0, $month, 1, $year));
    $day = 1;

    while ($day <= $daysInMonth) {
        $dow = (int)date('w', mktime(0, 0, 0, $month, $day, $year));
        if ($dow === 0 || $dow === 6) {
            $day++;
            continue;
        }
        $weekIndex++;
        $start = $day;
        $end = $day;
        while ($day <= $daysInMonth) {
            $wd = (int)date('w', mktime(0, 0, 0, $month, $day, $year));
            if ($wd === 0 || $wd === 6) {
                break;
            }
            $end = $day;
            $day++;
            if ($wd === 5) {
                break;
            }
        }
        $weekStart = sprintf('%04d-%02d-%02d', $year, $month, $start);
        $weekEnd = sprintf('%04d-%02d-%02d', $year, $month, $end);
        $weeks[] = [
            'week_index' => $weekIndex,
            'week_start' => $weekStart,
            'week_end' => $weekEnd,
            'label' => "S{$weekIndex} ({$start}–{$end})",
        ];
    }

    return $weeks;
}

function ticketWeekIndexForMonth(string $closedAt, int $year, int $month): ?int
{
    $ts = strtotime($closedAt);
    if ($ts === false) {
        return null;
    }
    if ((int)date('Y', $ts) !== $year || (int)date('n', $ts) !== $month) {
        return null;
    }
    $day = (int)date('j', $ts);
    foreach (calendarMonthWeeks($year, $month) as $w) {
        $start = (int)substr($w['week_start'], 8, 2);
        $end = (int)substr($w['week_end'], 8, 2);
        if ($day >= $start && $day <= $end) {
            return (int)$w['week_index'];
        }
    }
    return null;
}

function isFridayOrLater(): bool
{
    $dow = (int)date('w');
    return $dow === 5 || $dow === 6 || $dow === 0;
}

function currentYearMonth(): array
{
    return ['year' => (int)date('Y'), 'month' => (int)date('n')];
}
