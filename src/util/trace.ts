interface Tracer {
    warn(message: string): void;
}

class NoOpTracer implements Tracer {
    warn(message: string): void {
    }
}

class ConsoleTracer implements Tracer {
    warn(message: string): void {
        console.warn(message);
    }
}

export class Trace {
    private static tracer: Tracer = new ConsoleTracer();

    static off() {
        Trace.tracer = new NoOpTracer();
    }
    
    static warn(message: string) {
        this.tracer.warn(message);
    }
}