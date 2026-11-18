export const COURSE_MODULES = [
  {
    id: 'mod-1',
    number: '01',
    title: 'Foundations',
    lessonCount: 4,
    completedCount: 1,
    lessons: [
      {
        id: 'how-a-request-travels',
        title: 'How a Request Travels',
        duration: '10 min',
        level: 'Beginner',
        stepCount: 10,
        subtitle: 'Follow one page load hop by hop — and find out where the time really goes.',
        whatYouLearn: [
          'What DNS does and why it is cached',
          'Why a connection costs multiple network round trips',
          'How a Load Balancer intercepts and inspects traffic',
          'Where page-load time actually goes (hops breakdown)',
          'What happens during slow queries and server degradation'
        ],
        steps: [
          {
            stepNumber: 1,
            tag: 'CONCEPT',
            title: 'Hit Enter in the Browser',
            explanation: 'You type "https://shop.example" and press Enter. The browser knows the domain name, but internet routers and switches only understand numeric IP addresses (like 203.0.113.7).',
            goodToKnow: 'Before even touching the physical network, the browser first checks its internal in-memory DNS cache and your OS hosts file.',
            whatChanged: ['+ Browser initiates navigation', '+ Local cache check: miss'],
            timings: { dns: '-', connect: '-', lb: '-', server: '-', total: '0 ms' },
            nodes: { client: true, dns: false, lb: false, serverA: false, serverB: false, serverC: false },
            packet: { from: 'client', to: 'client', label: 'Idle' },
            speechBubble: 'User presses Enter: https://shop.example'
          },
          {
            stepNumber: 2,
            tag: 'TECHNIQUE',
            title: 'Find the Address (DNS Lookup)',
            explanation: 'Networks route by numeric IP address, not by name. So the browser queries a DNS resolver: "Where is shop.example?" The resolver walks the DNS hierarchy and returns the Virtual IP (VIP) 203.0.113.7 in ~20 ms.',
            goodToKnow: 'Answers are cached for a Time-to-Live (TTL). For the next few minutes, repeat visits skip this step entirely.',
            whatChanged: ['+ DNS resolver contacted', '+ Lookup duration: 20 ms', '+ Resolved VIP: 203.0.113.7'],
            timings: { dns: '20 ms', connect: '-', lb: '-', server: '-', total: '20 ms' },
            nodes: { client: true, dns: true, lb: false, serverA: false, serverB: false, serverC: false },
            packet: { from: 'client', to: 'dns', label: 'where is shop.example?' },
            speechBubble: 'where is shop.example?'
          },
          {
            stepNumber: 3,
            tag: 'HANDSHAKE',
            title: 'Establish TCP Connection',
            explanation: 'Now with the IP address in hand, the browser opens a reliable transport stream. It sends a TCP SYN packet to port 443 of the load balancer. The balancer answers with SYN-ACK, and the client sends ACK. This 3-way handshake takes 1 full round-trip time (RTT).',
            goodToKnow: 'If the server is geographically distant (e.g. across an ocean), this single handshake can easily cost 80 to 140 ms before any data is sent.',
            whatChanged: ['+ TCP 3-way handshake complete', '+ Connection RTT: 28 ms'],
            timings: { dns: '20 ms', connect: '28 ms', lb: '-', server: '-', total: '48 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: false, serverB: false, serverC: false },
            packet: { from: 'client', to: 'lb', label: 'TCP SYN / ACK' },
            speechBubble: 'TCP SYN -> VIP 203.0.113.7:443'
          },
          {
            stepNumber: 4,
            tag: 'SECURITY',
            title: 'TLS 1.3 Cryptographic Handshake',
            explanation: 'Because the URL begins with "https://", traffic must be encrypted. The browser and load balancer negotiate cryptographic cipher suites and exchange ephemeral Diffie-Hellman keys. In modern TLS 1.3, this takes exactly 1 RTT.',
            goodToKnow: 'Many load balancers perform "TLS Termination" — decrypting HTTPS at the edge so backend servers can run plain HTTP over high-speed private VPC networks.',
            whatChanged: ['+ TLS 1.3 negotiated (AES-256-GCM)', '+ Handshake latency: 24 ms'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '-', server: '-', total: '72 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: false, serverB: false, serverC: false },
            packet: { from: 'client', to: 'lb', label: 'TLS ClientHello / Keys' },
            speechBubble: 'TLS 1.3 Encrypted Session'
          },
          {
            stepNumber: 5,
            tag: 'ARCHITECTURE',
            title: 'HTTP Request Hits Load Balancer',
            explanation: 'The browser sends: "GET /products/123 HTTP/2". The Virtual Load Balancer intercepts this packet at its public VIP. It parses the request headers, inspects client cookies, checks health status of all backend pools, and chooses the optimal destination.',
            goodToKnow: 'The load balancer acts as a reverse proxy shield: external users never see the private IP addresses of the internal application servers.',
            whatChanged: ['+ HTTP GET received by VIP', '+ Balancer evaluates active algorithm'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '1.8 ms', server: '-', total: '73.8 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: true, serverB: true, serverC: true },
            packet: { from: 'client', to: 'lb', label: 'GET /products/123' },
            speechBubble: 'GET /products/123'
          },
          {
            stepNumber: 6,
            tag: 'ALGORITHM',
            title: 'Algorithm Chooses Target Server',
            explanation: 'The load balancer evaluates the cluster pool. Server A has 14 active connections, Server B has 4, and Server C has 9. Using the Least Connections algorithm, the balancer selects Server B to prevent overloading.',
            goodToKnow: 'If Server B were failing health checks (e.g. throwing 500s or timing out), the load balancer would bypass it automatically in microseconds.',
            whatChanged: ['+ Algorithm: Least Connections', '+ Selected Target: Server B (4 conns)'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '2.4 ms', server: '-', total: '74.4 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: true, serverB: true, serverC: true },
            packet: { from: 'lb', to: 'serverB', label: 'Forward to Server B' },
            speechBubble: 'Forwarding to Server B (10.0.1.27)'
          },
          {
            stepNumber: 7,
            tag: 'BACKEND',
            title: 'Backend Processing & DB Query',
            explanation: 'Server B receives the forwarded HTTP request. Its web application framework parses the query parameters, queries a Postgres replica for product details, renders JSON payload, and formats HTTP 200 OK.',
            goodToKnow: 'High database latency (e.g. unindexed queries) directly spikes the server connection count, causing intelligent load balancers to back off and route subsequent requests elsewhere.',
            whatChanged: ['+ Server B query executed in 35 ms', '+ Memory cache hit: 98%'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '2.4 ms', server: '38 ms', total: '112.4 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: true, serverB: true, serverC: true },
            packet: { from: 'serverB', to: 'serverB', label: 'DB Query + Render' },
            speechBubble: 'SELECT * FROM products WHERE id=123'
          },
          {
            stepNumber: 8,
            tag: 'RESPONSE',
            title: 'Response Streams Back Through Balancer',
            explanation: 'Server B transmits the response: "HTTP/2 200 OK (Content-Length: 4.8 KB)". The response flows back through the load balancer, which compresses it with Gzip/Brotli, wraps it in TLS encryption, and streams it across the internet to the client.',
            goodToKnow: 'In Direct Server Return (DSR) topologies, backend servers reply directly to clients bypassing the balancer for outbound throughput, but this requires specialized Layer 4 setups.',
            whatChanged: ['+ HTTP 200 OK response sent', '+ Transfer size: 4.8 KB Brotli'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '3.2 ms', server: '38 ms', total: '113.2 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: true, serverB: true, serverC: true },
            packet: { from: 'serverB', to: 'lb', label: 'HTTP/2 200 OK' },
            speechBubble: '200 OK (4.8 KB payload)'
          },
          {
            stepNumber: 9,
            tag: 'CLIENT',
            title: 'Browser Renders & Keep-Alive',
            explanation: 'The client receives the response bytes in ~18 ms of wire transit. The browser parses the JSON, updates the DOM, and keeps the underlying TCP/TLS connection open (HTTP Keep-Alive) so future requests skip DNS, TCP, and TLS overhead entirely.',
            goodToKnow: 'Subsequent requests over this warm connection take only ~40 ms total instead of the original 131 ms — a ~70% speedup!',
            whatChanged: ['+ DOM paint triggered', '+ Connection pooled for reuse'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '3.2 ms', server: '38 ms', total: '131.2 ms' },
            nodes: { client: true, dns: false, lb: true, serverA: false, serverB: true, serverC: false },
            packet: { from: 'lb', to: 'client', label: 'Render Payload' },
            speechBubble: 'Page Rendered in 131.2 ms'
          },
          {
            stepNumber: 10,
            tag: 'RECAP',
            title: 'Lesson Summary & Takeaways',
            explanation: 'You followed a request from the initial keystroke to DNS, TCP, TLS, load balancing decision, backend execution, and client rendering. Notice how network handshakes and protocol overhead frequently exceed actual application compute time.',
            goodToKnow: 'Modern infrastructure optimizes this via CDNs, connection pooling, Anycast routing, and intelligent proximity-aware load balancing.',
            whatChanged: ['✓ Lesson completed', '+ Total elapsed: 131.2 ms', '+ 5 round trips dissected'],
            timings: { dns: '20 ms', connect: '52 ms', lb: '3.2 ms', server: '38 ms', total: '131.2 ms' },
            nodes: { client: true, dns: true, lb: true, serverA: true, serverB: true, serverC: true },
            packet: { from: 'client', to: 'client', label: 'Complete' },
            speechBubble: 'Lesson Complete! Ready for Algorithms Deep Dive.'
          }
        ]
      },
      {
        id: 'latency-and-throughput',
        title: 'Latency, Bandwidth & Throughput',
        duration: '8 min',
        level: 'Beginner',
        stepCount: 6,
        subtitle: 'Understand the three fundamental pillars of distributed network performance.',
        whatYouLearn: [
          'The crucial difference between latency and bandwidth',
          'Little\'s Law: Concurrency = Throughput × Latency',
          'How queuing delay explodes as load reaches 100%'
        ]
      },
      {
        id: 'napkin-math',
        title: 'System Design Napkin Math',
        duration: '12 min',
        level: 'Intermediate',
        stepCount: 7,
        subtitle: 'Back-of-the-envelope calculations for requests per second, bandwidth, and memory.',
        whatYouLearn: [
          'Numbers every programmer should know (L1 cache vs RAM vs SSD vs Network)',
          'Estimating QPS, storage, and server counts for 10M DAU'
        ]
      },
      {
        id: 'load-balancer-basics',
        title: 'Why Load Balancing Matters',
        duration: '6 min',
        level: 'Beginner',
        stepCount: 5,
        subtitle: 'Single point of failure (SPOF) risks, horizontal scaling, and zero-downtime deploys.',
        whatYouLearn: [
          'Horizontal vs Vertical scaling trade-offs',
          'Reverse proxy fundamentals'
        ]
      }
    ]
  },
  {
    id: 'mod-2',
    number: '02',
    title: 'Scaling & Topologies',
    lessonCount: 4,
    completedCount: 0,
    lessons: [
      {
        id: 'layer4-vs-layer7',
        title: 'Layer 4 vs Layer 7 Load Balancing',
        duration: '12 min',
        level: 'Intermediate',
        stepCount: 8,
        subtitle: 'Transport layer (TCP/UDP IP packet routing) vs Application layer (HTTP header/cookie routing).',
        whatYouLearn: [
          'L4: Ultra-high packet throughput and zero payload inspection',
          'L7: Path routing, cookie sticky sessions, and TLS termination'
        ]
      },
      {
        id: 'reverse-proxy-vs-lb',
        title: 'Reverse Proxy vs Load Balancer',
        duration: '7 min',
        level: 'Beginner',
        stepCount: 5,
        subtitle: 'When to use Nginx vs Envoy vs HAProxy vs Cloud AWS ALB.',
        whatYouLearn: [
          'Reverse proxy roles: caching, compression, rate limiting',
          'Load balancer roles: cluster scheduling, health check draining'
        ]
      },
      {
        id: 'high-availability-vips',
        title: 'High Availability & Virtual IPs (VIPs)',
        duration: '10 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Eliminating the load balancer as a single point of failure using VRRP and Keepalived.',
        whatYouLearn: [
          'Active-Passive vs Active-Active LB pairs',
          'Gratuitous ARP and IP takeover in milliseconds'
        ]
      },
      {
        id: 'direct-server-return',
        title: 'Direct Server Return (DSR)',
        duration: '11 min',
        level: 'Advanced',
        stepCount: 6,
        subtitle: 'Handling massive video/image downloads by bypassing the balancer on the return path.',
        whatYouLearn: [
          'Asymmetric bandwidth: 1 KB request in, 10 MB video out',
          'MAC address rewriting without IP header modification'
        ]
      }
    ]
  },
  {
    id: 'mod-3',
    number: '03',
    title: 'Algorithms Deep Dive',
    lessonCount: 5,
    completedCount: 1,
    lessons: [
      {
        id: 'round-robin-weighted',
        title: 'Round Robin & Weighted Round Robin',
        duration: '9 min',
        level: 'Beginner',
        stepCount: 6,
        subtitle: 'Sequential cyclical balancing and capacity-weighted node allocations.',
        whatYouLearn: [
          'Smooth weighted round robin (Nginx GCD algorithm)',
          'When homogeneous assumption breaks under heavy queries'
        ]
      },
      {
        id: 'least-connections-ewma',
        title: 'Least Connections & Response Time',
        duration: '10 min',
        level: 'Intermediate',
        stepCount: 7,
        subtitle: 'Dynamic load-aware routing for varying query durations and WebSockets.',
        whatYouLearn: [
          'Active connection state synchronization',
          'Peak EWMA (Exponentially Weighted Moving Average) latency routing'
        ]
      },
      {
        id: 'ip-hash-sticky',
        title: 'IP Hash & Sticky Sessions',
        duration: '8 min',
        level: 'Beginner',
        stepCount: 6,
        subtitle: 'Client affinity, stateful session mapping, and NAT proxy pitfalls.',
        whatYouLearn: [
          'Hashing client IPs to server IDs',
          'Why corporate proxies break hash uniformity'
        ]
      },
      {
        id: 'consistent-hashing-ring',
        title: 'Consistent Hashing & Ring Partitions',
        duration: '14 min',
        level: 'Advanced',
        stepCount: 8,
        subtitle: 'Minimizing cache reshuffling when servers join or leave the pool.',
        whatYouLearn: [
          'The 2^32 hash ring topology',
          'Virtual nodes (vnodes) to prevent hot-spot clumping'
        ]
      },
      {
        id: 'power-of-two-choices',
        title: 'Random & Power of Two Choices (P2C)',
        duration: '9 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Why picking two random servers and routing to the less loaded one is near-optimal.',
        whatYouLearn: [
          'Exponentially reduced maximum queue lengths',
          'Zero shared synchronization state across multiple balancers'
        ]
      }
    ]
  },
  {
    id: 'mod-4',
    number: '04',
    title: 'Health & Reliability',
    lessonCount: 3,
    completedCount: 0,
    lessons: [
      {
        id: 'active-passive-health',
        title: 'Active vs Passive Health Probes',
        duration: '8 min',
        level: 'Beginner',
        stepCount: 5,
        subtitle: 'Periodic /healthz pinging vs real-time connection error rate surveillance.',
        whatYouLearn: [
          'Flapping detection and hysteresis thresholds',
          'Shallow vs Deep health check risks'
        ]
      },
      {
        id: 'circuit-breakers',
        title: 'Circuit Breaking & Outlier Detection',
        duration: '11 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Preventing cascading failures when a downstream database or service degrades.',
        whatYouLearn: [
          'Closed, Open, and Half-Open circuit breaker states',
          'Envoy-style consecutive 5xx error eviction'
        ]
      },
      {
        id: 'graceful-draining',
        title: 'Connection Draining & Zero Downtime',
        duration: '9 min',
        level: 'Intermediate',
        stepCount: 5,
        subtitle: 'Upgrading servers without dropping active customer shopping carts or streams.',
        whatYouLearn: [
          'TCP connection draining timers',
          'Deregistration delay in production cloud balancers'
        ]
      }
    ]
  },
  {
    id: 'mod-5',
    number: '05',
    title: 'Protocols & TLS',
    lessonCount: 3,
    completedCount: 0,
    lessons: [
      {
        id: 'tls-termination',
        title: 'TLS Termination & Offloading',
        duration: '10 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Terminating encryption at the load balancer vs end-to-end TLS.',
        whatYouLearn: [
          'CPU offloading: freeing backends from cryptographic math',
          'Zero-trust mesh architectures'
        ]
      },
      {
        id: 'http2-grpc-multiplexing',
        title: 'HTTP/2 & gRPC Multiplexing Trap',
        duration: '12 min',
        level: 'Advanced',
        stepCount: 7,
        subtitle: 'Why L4 balancers send all gRPC traffic to one server and how L7 resolves it.',
        whatYouLearn: [
          'Single TCP stream multiplexing multiple concurrent RPCs',
          'Client-side balancing vs L7 proxy balancing'
        ]
      },
      {
        id: 'websockets-sse',
        title: 'WebSockets & Server-Sent Events',
        duration: '8 min',
        level: 'Intermediate',
        stepCount: 5,
        subtitle: 'Managing millions of long-lived open sockets through a balancer.',
        whatYouLearn: [
          'File descriptor exhaustion (uLimit limits)',
          'Sticky routing for persistent stateful connections'
        ]
      }
    ]
  },
  {
    id: 'mod-6',
    number: '06',
    title: 'Traffic & Defense',
    lessonCount: 3,
    completedCount: 0,
    lessons: [
      {
        id: 'rate-limiting-token-bucket',
        title: 'Rate Limiting & Token Buckets',
        duration: '10 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Defending backend APIs against abusive clients and sudden query storms.',
        whatYouLearn: [
          'Token Bucket vs Leaky Bucket algorithms',
          'Redis cluster sliding window rate limiters'
        ]
      },
      {
        id: 'canary-traffic-splitting',
        title: 'Canary & Blue-Green Traffic Splitting',
        duration: '9 min',
        level: 'Intermediate',
        stepCount: 6,
        subtitle: 'Routing 5% of traffic to a new version to test performance in production.',
        whatYouLearn: [
          'Weighted traffic steering',
          'Cookie and header-based release targeting'
        ]
      },
      {
        id: 'ddos-surge-mitigation',
        title: 'DDoS Mitigation & Traffic Surges',
        duration: '11 min',
        level: 'Advanced',
        stepCount: 7,
        subtitle: 'SYN floods, HTTP GET storms, and absorbing sudden spikes.',
        whatYouLearn: [
          'SYN cookies defense',
          'Backpressure, shedding, and queue prioritization'
        ]
      }
    ]
  }
];

export const CHEATSHEETS_DATA = [
  {
    category: 'Load Balancing Algorithms',
    items: [
      { name: 'Round Robin', time: 'O(1)', state: 'Minimal (index)', pros: 'Equal request counts, zero config', cons: 'Ignores server resource saturation', bestFor: 'Stateless identical servers' },
      { name: 'Least Connections', time: 'O(N) / O(log N)', state: 'Active conn counters', pros: 'Prevents overload during long tasks', cons: 'Requires shared connection state', bestFor: 'WebSockets, long queries' },
      { name: 'Weighted Round Robin', time: 'O(1)', state: 'Weights table', pros: 'Utilizes heterogeneous servers', cons: 'Weights must be tuned or calibrated', bestFor: 'Mixed cloud instance sizes' },
      { name: 'IP Hash', time: 'O(1)', state: 'None', pros: 'Sticky sessions without Redis', cons: 'Uneven behind corporate NAT proxies', bestFor: 'In-memory caches, cart persistence' },
      { name: 'Consistent Hashing', time: 'O(log N)', state: 'Hash ring vnodes', pros: 'Minimal cache eviction on node resize', cons: 'More complex ring data structure', bestFor: 'Distributed caches (Memcached/Redis)' },
      { name: 'Power of Two (P2C)', time: 'O(1)', state: 'None', pros: 'Near-optimal without central coordination', cons: 'Minor statistical variance', bestFor: 'Massive microservice meshes' }
    ]
  },
  {
    category: 'Latency Numbers Every Systems Engineer Should Know',
    items: [
      { name: 'L1 Cache Reference', time: '0.5 ns', state: 'Hardware', pros: 'Blazing fast', cons: 'Tiny (32 KB - 64 KB)', bestFor: 'CPU registers' },
      { name: 'L2 Cache Reference', time: '7 ns', state: 'Hardware', pros: '14x slower than L1', cons: 'Still small (~512 KB)', bestFor: 'CPU cores' },
      { name: 'RAM Memory Read', time: '100 ns', state: 'Memory', pros: 'Fast volatile store', cons: 'Lost on power reboot', bestFor: 'Active processes' },
      { name: 'NVMe SSD Random Read', time: '10,000 ns (10 µs)', state: 'Disk', pros: 'Persistent flash storage', cons: '100x slower than RAM', bestFor: 'Database tables' },
      { name: 'Packet Round-Trip Same Datacenter', time: '500,000 ns (0.5 ms)', state: 'Intra-DC Network', pros: 'High bandwidth (100 Gbps)', cons: 'VPC hop latency', bestFor: 'Microservice RPCs' },
      { name: 'Packet Round-Trip US-East to US-West', time: '60,000,000 ns (60 ms)', state: 'WAN Network', pros: 'Speed of light in fiber', cons: 'Cannot be beaten by software', bestFor: 'Cross-region replication' },
      { name: 'Packet Round-Trip US to Europe', time: '120,000,000 ns (120 ms)', state: 'Trans-Atlantic', pros: 'Global reach', cons: 'Severe interactive penalty', bestFor: 'Global DNS/CDN edge caching' }
    ]
  }
];
