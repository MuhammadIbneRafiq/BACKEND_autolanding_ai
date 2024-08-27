import { supabaseClient } from "../db/params.js";

export const SearchTwitter = async (email) => {
  try {
    const { data, error } = await supabaseClient
      .from("buyer_seller_table")
      .select("role")
      .eq("email", email)
      .single();

    if (error) {
      throw error;
    }

    // // Check the role and return appropriate result
    // if (data.role !== "buyer" || data.role !== "seller") {
    //   return tweetResult;
    // }
    
    return tweetResult;
  } catch (error) {
    console.error("Error in SearchTwitter:", error);
    return tweetResult.slice(0, 3);  // Return the first three results in case of an error
  }
};

export const tweetResult = [
  {
    id: 1,
    name: "Alex Johnson",
    tweet:
      "Looking for new freelance opportunities in web development. Available to start immediately. #freelance #webdev",
    profile:
      "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
    url: "https://www.linkedin.com/in/jamae/",
  },
  {
    id: 2,
    name: "Maria Garcia",
    tweet:
      "Experienced graphic designer open for freelance projects. DM me if you need a creative mind! #freelance #graphicdesign",
    profile:
      "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
    url: "https://www.linkedin.com/in/vasilijesimic/",
  },
  {
    id: 3,
    name: "Michael Brown",
    tweet:
      "Currently looking for freelance software development work. Specialize in Python and Django. #freelance #Python",
    profile:
      "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
    url: "https://www.linkedin.com/in/filip-wauters/",
  },
  {
    id: 4,
    name: "Emily Davis",
    tweet:
      "Available for freelance copywriting. Get in touch for quality content that resonates with your audience. #freelance #copywriting",
    profile:
      "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
    url: "https://www.linkedin.com/in/thomaspalermo",
  },
  // {
  //   id: 5,
  //   name: "John Wilson",
  //   tweet:
  //     "Looking for a new project! Freelance full-stack developer with experience in React and Node.js. #freelance #fullstack",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
  // {
  //   id: 6,
  //   name: "Sophia Martinez",
  //   tweet:
  //     "Freelance digital marketing expert available to boost your brand's online presence. Let's connect! #freelance #digitalmarketing",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
  // {
  //   id: 7,
  //   name: "James Anderson",
  //   tweet:
  //     "Offering freelance photography services. Capturing moments that matter. Contact me for collaborations. #freelance #photography",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
  // {
  //   id: 8,
  //   name: "Olivia Taylor",
  //   tweet:
  //     "Available for freelance UX/UI design projects. Creating user-centered designs that engage and convert. #freelance #uxdesign",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
  // {
  //   id: 9,
  //   name: "Daniel Hernandez",
  //   tweet:
  //     "Freelance mobile app developer open to new projects. Let's build something amazing together! #freelance #mobiledev",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
  // {
  //   id: 10,
  //   name: "Emma Lee",
  //   tweet:
  //     "Looking for freelance writing gigs. Experienced in blog posts, articles, and creative content. #freelance #writing",
  //   profile:
  //     "https://pbs.twimg.com/profile_images/1624781151809466368/tnuASsdY_400x400.jpg",
  // },
];
