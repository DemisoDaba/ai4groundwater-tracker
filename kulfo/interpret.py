"""Interpret groundwater condition."""

def interpret(value):
    if value > 0:
        return "Groundwater condition: More groundwater storage than the reference condition\nReference condition: April 2023 (wet season)"
    elif value < 0:
        return "Groundwater condition: Less groundwater storage than the reference condition\nReference condition: January 2023 (dry season)"
    else:
        return "Groundwater condition: Close to the reference condition\nReference condition: April 2023 (wet season)"
