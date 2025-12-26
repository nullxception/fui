export class TextLineStream extends TransformStream {
  constructor() {
    let buffer = "";
    super({
      transform(chunk, controller) {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        lines.forEach((line) => controller.enqueue(line));
      },
      flush(controller) {
        if (buffer) controller.enqueue(buffer);
      },
    });
  }
}
