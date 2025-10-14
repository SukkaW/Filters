import { TransformStream } from 'node:stream/web';

export class FilterMinifyStream extends TransformStream<string, string> {
  // private __buf = '';
  private readonly set = new Set<string>();

  constructor() {
    super({
      transform: (line, controller) => {
        if (
          line.length === 0 // ignore empty lines
          || line[0] === '!' // ignore comments
          || (
            line[0] === '#' // ignore comments
            && (line[1] !== '#' && line[1] !== '@') // but keep ## and #@#
          )
          || (line[0] === '[' && line[line.length - 1] === ']')
        ) {
          return;
        }

        if (this.set.has(line)) {
          // console.log('deduped!', line);
          return;
        }
        this.set.add(line);

        controller.enqueue(line);
        controller.enqueue('\n');
      }
    });
  }
}
