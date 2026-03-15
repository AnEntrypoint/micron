export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const isBlack = p => [1,3,6,8,10].includes(p%12);
export const noteColor = p => `hsl(${[0,30,60,90,120,180,240,270,300,210,150,330][p%12]},60%,45%)`;
export const velColor = v => v<43?'#00e5ff':v<86?'#00e676':v<107?'#ffd600':'#ff6b00';

export const FILTER_TYPES = ['bypass','mg 4-pole LP','ob 2-pole LP','ob 2-pole BP','ob 2-pole HP','rp 4-pole LP','tb 3-pole LP','jp 4-pole LP','8-pole LP','op 4-pole HP','8ve dual BP','6-pole BP','phase warp','comb 1','comb 2','comb 3','comb 4','vocal formant 1','vocal formant 2','vocal formant 3','bandlimit'];
export const FX1_TYPES = ['bypass','super phaser','string phaser','theta flanger','thru-0 flanger','chorus','vocoder'];
export const FX2_TYPES = ['bypass','mono delay','stereo delay','split delay','hall reverb','plate reverb','room reverb'];
export const DRIVE_TYPES = ['bypass','compressor','rms limiter','tube overdrive','distortion','tube amp','fuzz pedal'];
export const ARP_PATTERNS = ['*random*','ant march','teletype','acid bass','spitter','samba','chemical','bodiddle','hats on','hats off','rave stomp','carnaval','stutter','a three and a four','samba march','skip to this','skittering','pipeline','fanfare','swinging','chikka-chikka','fee oh fee','robo-shuffle','deliberate','morse code','hit the 4','heart beep','perka','reveille','vari-poly','tango','hesitant'];
export const ARP_ORDERS = ['forward','reverse','trigger','r-n-r in','r-n-r x','oct jump'];
export const ARP_MULTS = ['1/4','1/3','1/2','1','2','3','4'];
export const ARP_MODES = ['on','off','latch'];
export const ARP_SPANS = ['up','down','centered'];
export const TEMPO_SYNC_RATES = ['16','12','10⅔','8','6','5⅓','4','3','2⅔','2','1½','1⅓','1','3/4','2/3','1/2','3/8','1/3','1/4','3/16','1/6','1/8','3/32','1/12','1/16'];
export const ENV_SLOPES = ['linear','exp+','exp-'];
export const ENV_LOOPS = ['decay','zero','hold','off'];
export const ENV_RESETS = ['mono','poly','key mono','key poly','arp mono'];
export const PORTAMENTO_TYPES = ['fixed','scaled','gliss fixed','gliss scaled'];
export const PORTAMENTO_MODES = ['normal','legato'];
export const PITCH_BEND_MODES = ['affects all held keys','affects all playing notes'];
export const UNISON_VOICES = ['2','4','8'];
export const PATCH_CATEGORIES = ['recent','faves','bass','lead','pad','string','brass','key','comp','drum','sfx'];
export const NOISE_TYPES = ['pink','white'];
export const SYNC_TYPES = ['soft','hard'];
export const FM_ALGORITHMS = ['3->2->1','2->1<-3','2->1'];
export const FM_TYPES = ['linear','exp'];
export const WAVE_NAMES = ['sine','tri/saw','pulse'];
export const OCT_LABELS = ['-3','-2','-1','0','+1','+2','+3'];
export const SEMI_LABELS = ['-7','-6','-5','-4','-3','-2','-1','0','+1','+2','+3','+4','+5','+6','+7'];
export const F2_OFFSET_TYPES = ['absolute','offset'];
export const PREFLT_SOURCES = ['osc1','osc2','osc3','F1 input','F2 input','ring','noise'];
export const TRACKING_PRESETS = ['custom','bypass','negate','abs val','neg abs','exp+','exp-','zero','maximum','minimum'];
export const SH_RESET_MODES = ['mono','poly','key mono','key poly','arp mono'];
export const BANKS = ['Red','Green','Blue','Yellow (user)','Edit'];

export const MOD_SRCS = ['note-on vel','release vel','key track','m1 wheel','m2 wheel','pitch wheel','sustain pedal','expr pedal','e1 level','e2 level','e3 level','lfo1 sine','lfo1 cos','lfo1 tri','lfo1 cos-tri','lfo1 saw','lfo1 cos-saw','lfo1 sq','lfo1 cos-sq','lfo2 sine','lfo2 cos','lfo2 tri','lfo2 cos-tri','lfo2 saw','lfo2 cos-saw','lfo2 sq','lfo2 cos-sq','s&h out','voice rnd','global rnd','porta lvl','porta fx','tracking','step track','ch pressure','poly aftertouch','cc1','cc2','cc3','cc4','cc5','cc6','cc7','cc8','cc9','cc10','cc11','cc12','cc13','cc14','cc15','cc16','cc17','cc18','cc19','cc20','cc21','cc22','cc23','cc24','cc25','cc26','cc27','cc28','cc29','cc30','cc31','cc66','cc67','cc68','cc69','cc70','cc71','cc72','cc73','cc74','cc75','cc76','cc77','cc78','cc79','cc80','cc81','cc82','cc83','cc84','cc85','cc86','cc87','cc88','cc89','cc90','cc91','cc92','cc93','cc94','cc95','cc102','cc103','cc104','cc105','cc106','cc107','cc108','cc109','cc110','cc111','cc112','cc113','cc114','cc115','cc116','cc117','cc118','cc119','keytrack extreme'];

export const MOD_DSTS = ['voice pitch','O1 pitch full','O2 pitch full','O3 pitch full','O1 pitch narrow','O2 pitch narrow','O3 pitch narrow','O1 shape','O2 shape','O3 shape','fm level','O1 level','O2 level','O3 level','ring mod lvl','noise lvl','ext in lvl','O1 bal','O2 bal','O3 bal','ring mod bal','noise bal','ext in bal','F1->F2 lvl','porta time','unison detune','F1 freq','F1 res','F1 env mod','F1 keytrk','F2 freq','F2 res','F2 env mod','F2 keytrk','lfo1 rate','lfo1 amp','lfo2 rate','lfo2 amp','s&h rate','s&h smooth','s&h amp','F1 level','F2 level','preflt lvl','F1 pan','F2 pan','preflt pan','drive lvl','prog level','main/aux bal','pan','e1 amp','e1 rate','e1 atk','e1 dec','e1 sus time','e1 sus lvl','e1 rel','e2 amp','e2 rate','e2 atk','e2 dec','e2 sus time','e2 sus lvl','e2 rel','e3 amp','e3 rate','e3 atk','e3 dec','e3 sus time','e3 sus lvl','e3 rel','dummy','fx mix','fx param a','fx param b','fx param c','fx param d','voice pitch narrow'];

export const SCALES = {Chromatic:null,Major:[0,2,4,5,7,9,11],'Minor Nat':[0,2,3,5,7,8,10],'Minor Harm':[0,2,3,5,7,8,11],Dorian:[0,2,3,5,7,9,10],Phrygian:[0,1,3,5,7,8,10],Lydian:[0,2,4,6,7,9,11],Mixolydian:[0,2,4,5,7,9,10],Locrian:[0,1,3,5,6,8,10],Pentatonic:[0,2,4,7,9],Blues:[0,3,5,6,7,10],'Whole Tone':[0,2,4,6,8,10],Diminished:[0,2,3,5,6,8,9,11]};
export const CHORD_PRESETS = {Off:[],Maj:[4,7],Min:[3,7],Dom7:[4,7,10],Maj7:[4,7,11],Min7:[3,7,10],Sus2:[2,7],Sus4:[5,7],Aug:[4,8],Dim:[3,6],Dim7:[3,6,9]};

export const filterHz = x => x >= 1023 ? 20000 : Math.exp(x/147.933647)*20;
export const envMs = x => x >= 255 ? 30000 : Math.exp(x/23.177415)/2;
export const lfoHz = x => x >= 1023 ? 1000 : Math.exp(x/88.85677)/100;
export const portaMs = x => x >= 127 ? 10000 : Math.exp(x/18.38514)*10;
export const fmPct = x => (x/1000*100).toFixed(1)+'%';
export const semisToHz = (s,base=440) => base*Math.pow(2,s/12);
export const stepFracLabel = v => ({0.03125:'1/32',0.0625:'1/16',0.125:'1/8',0.25:'1/4',0.5:'1/2',1:'1',1.5:'3/2',2:'2',3:'3',4:'4'}[v]||String(v));

export const FX1_PARAM_NAMES = {
  0: {A:'—',B:'—',C:'—',D:'—',E:'—',F:'—',G:'—',H:'—'},
  1: {A:'feedback',B:'notch freq',C:'lfo rate',D:'lfo depth',E:'lfo shape',F:'stages',G:'tempo sync',H:'lfo rate sync'},
  2: {A:'feedback',B:'notch freq',C:'lfo rate',D:'lfo depth',E:'lfo shape',F:'—',G:'tempo sync',H:'lfo rate sync'},
  3: {A:'feedback',B:'manual delay',C:'lfo rate',D:'lfo depth',E:'lfo shape',F:'—',G:'tempo sync',H:'lfo rate sync'},
  4: {A:'feedback',B:'manual delay',C:'lfo rate',D:'lfo depth',E:'lfo shape',F:'—',G:'tempo sync',H:'lfo rate sync'},
  5: {A:'feedback',B:'manual delay',C:'lfo rate',D:'lfo depth',E:'lfo shape',F:'—',G:'tempo sync',H:'lfo rate sync'},
  6: {A:'analysis sens',B:'sibilance boost',C:'decay',D:'lfo depth',E:'band shift',F:'synth signal',G:'analysis signal',H:'analysis mix'},
};
export const FX2_PARAM_NAMES = {
  0: {A:'—',B:'—',C:'—',D:'—',E:'—',F:'—'},
  1: {A:'delay time',B:'feedback',C:'param C',D:'param D',E:'param E',F:'param F'},
  2: {A:'delay time',B:'feedback',C:'param C',D:'param D',E:'param E',F:'param F'},
  3: {A:'delay time',B:'feedback',C:'param C',D:'param D',E:'param E',F:'param F'},
  4: {A:'decay',B:'pre-delay',C:'param C',D:'param D',E:'param E',F:'param F'},
  5: {A:'decay',B:'pre-delay',C:'param C',D:'param D',E:'param E',F:'param F'},
  6: {A:'decay',B:'pre-delay',C:'param C',D:'param D',E:'param E',F:'param F'},
};
