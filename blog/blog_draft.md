Possible titles (All these are bad. I need some help):

* How do psychiatric drugs work?  
* What is the right way to think about neuropharmacology?  
* What's the intuition behind psychiatric drug effects?  
* Visualizing the intuition behind different classes of psychiatric drugs.  
* What does the intuition behind different classes of psychiatric drugs look like?  
* Something about receptors and transporters? 

To say that the brain is complex is an understatement. It has an almost fractal-like level of intricacy, where each time neuroscientists think they’ve reached the most basic level, they find that there is a whole new level of complexity hiding within it. This has especially been the case in the domain of psychiatry and psychiatric drug development, where with each decade more is learned about just how many potential ways there are for a drug to interact with the information signalling process of the brain. A particularly striking example is our understanding of the role of serotonin in the brain. When serotonin was first discovered in the 1960s, there was thought to be just a single type of serotonin receptor. Then it was discovered that there were multiple different types. Then that each of those types had subtypes. Then that each of those subtypes had multiple different kinds of ways to activate it. 

As more is learned about the brain, it becomes possible to reason about new classes of drugs which might impact the brain in different ways, with different profiles of what their effects and side effects might look like. These drugs often center around how they impact the transmission of a signal between two or more different neurons. Like a radio signal, these transmissions convey a spatiotemporal pattern based on when and where signalling chemicals are sent across a synapse from a presynaptic neuron to a postsynaptic neuron. Different classes of psychiatric drugs impact this signal in different kinds of characteristic ways. Again returning to serotonin, both an antidepressant like escitalopram and the investigational PTSD drug MDMA impact serotonin signalling, but do so in drastically different ways. In order to better explain the intuition behind how this happens, I developed a simple interactive visual and auditory simulation of a toy synapse. If you would like to jump straight to interacting with the tool itself, [the link is here](https://awjuliani.github.io/neuro-pharma-viewer/). The rest of this post walks through what it can do and some of the intuition it can help convey.

*Disclaimer: The simulation is designed to convey the basic intuition about the spatiotemporal pattern of signal transmission and how psychiatric drug classes impact it. Due to its various simplifications, it is not intended to accurately model a synapse or be used to guide any clinical decision making.* 

![][image1]  
The basic simulation visually and auditorily (be sure to unmute it) conveys a simple spatiotemporal pattern of signalling between a hypothetical presynaptic and postsynaptic neuron. The particles are released from the presynaptic neuron and diffuse across the synapse towards the postsynaptic neuron. There are receptors on the postsynaptic neuron with which the particles can interact. When a particle locks into a receptor, it sets off a reaction that conveys a signal within the neuron. Depending on the type of receptor and its role within the neuron, that signal may either contribute to the neuron becoming more likely to fire, less likely, or to do something else within it. Particles eventually detach from the receptor and may diffuse back across the synapse towards the presynaptic neuron. If this happens, the presynaptic neuron has transporters which can reuptake the particles back into the cell to be recycled. In a highly simplified way, this is the basic lifecycle of many neurotransmitters. In addition to the animation, I also included a music staff with notes to better visually convey the spatiotemporal nature of the signalling. 

A psychiatric drug has a number of different places where it might influence this process, and depending on which way it does so, the nature of the change to the spatiotemporal pattern will be different. Overall I have included five different classes of drug types in the simulation: agonist, antagonist, releaser reuptake inhibitor, and allostatic modulator. Below I walk through each, discussing their effects and provide an example of each.

An agonist will bind to the receptors on the postsynaptic cell, causing them to send their signal within the cell. Depending on their strength, they may force the receptor to continue signalling much longer than the endogenous transmitter would have. This can result in the signal being sent across the synapse to become drowned out by the activation happening on the postsynaptic cell itself.  

![][image2]

On the other hand, a drug might bind to the receptors on the postsynaptic cell, but do so in a manner that blocks any transmissions from being communicated within the cell. These are referred to as antagonists, and their effect is to typically make the overall signal being sent across the synapse more sparse and stripped down.

![][image3]

In the case of the releaser, the drug interacts with the transporter on the presynaptic cell, forcing it to release rather than reuptake the transmitter particle. If this happens, the signal will become noisier and more chaotic. This is what happens with many stimulants in the amphetamine class, such as MDMA, a drug under investigation for use in the treatment of PTSD, which causes additional serotonin to be released from presynaptic cells, greatly increasing transmission.

![][image4]

Rather than forcing additional transmitter to be released from the transporter, a reuptake inhibitor also impacts the transporter, but does so by blocking transmitter from getting back into the presynaptic cell. This has the effect of also increasing the noise within a transmission, but does so in a manner that better preserves the spatiotemporal pattern of the original signal. The most well known example of this class of drug are the selective serotonin reuptake inhibitors such as Prozac and Lexapro, among others.

![][image5]

Finally, there are the allostatic modulators, which bind not to the receptor itself, but to sites on or nearby the receptor which modulate the signal that it sends within the neuron when activated. Within my simulator, I provide a representation of a positive allostatic modulator (PAM), which increases the strength of the signal without changing the temporal pattern of that signal. Because the spatiotemporal pattern remains intact, a number of psychiatric drug developers are exploring PAMs as possible next-generation replacements for existing drugs which act in one of the other mechanisms. Of course, they have their own downsides, as even simply increasing the strength of the signal may produce unwanted side effects.

![][image6]

The simulator also has a number of different parameters that can be adjusted to see their impact in realtime, such as changing the strength of the intervention or how long each drug binds to its target. I encourage people to try out different combinations to get a sense for how they change things, and in particular to how they change both the spatial and temporal nature of the signal being communicated. After playing with it a lot myself, I can say confidently that interacting directly with it provides a much better intuition than the static images provided in this post do. [Here is the link for those interested](https://awjuliani.github.io/neuro-pharma-viewer/). If you happen to find a bug or mistake anywhere, or would like to contribute an improvement or new feature, please feel free to send a PR to the repository at the following link. 
