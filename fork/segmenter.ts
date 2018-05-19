import { Query } from '../query/query';
import { Join, Step, Direction } from '../query/steps';

export function segmentQuery(query: Query): Query[] {
    const final = query.steps.reduce(
        (state, step) => state.transition(step),
        startState()
    );
    return final.segments();
}

type SegmenterState = {
    transition: (step: Step) => SegmenterState,
    segments: () => Query[]
};

function startState(): SegmenterState {
    return {
        transition: step => transitionFromLeading([], [], step),
        segments: () => []
    };
}

function leadingState(segments: Query[], current: Step[]): SegmenterState {
    return {
        transition: step => transitionFromLeading(segments, current, step),
        segments: () => segments.concat([new Query(current)])
    };
}

function transitionFromLeading(segments: Query[], current: Step[], step: Step): SegmenterState {
    if (step instanceof Join && step.direction === Direction.Successor) {
        return trailingState(segments, current.concat(step));
    }
    return leadingState(segments, current.concat(step));
}

function trailingState(segments: Query[], current: Step[]): SegmenterState {
    return {
        transition: step => transitionFromTrailing(segments, current, step),
        segments: () => segments.concat([new Query(current)])
    };
}

function transitionFromTrailing(segments: Query[], current: Step[], step: Step): SegmenterState {
    if (step instanceof Join && step.direction === Direction.Predecessor) {
        return leadingState(segments.concat([new Query(current)]), current.concat(step));
    }
    return trailingState(segments, current.concat(step));
}